import { describe, expect, it } from "vitest";
import { buildPuvioCheckoutRequest, completePuvioBillingReturn, computeProRenewal } from "@/lib/puvio-billing.server";
import { hmacSha256Hex, puvioBillingReturnPayload } from "@/lib/puvio-protocol.server";

type FakeState = {
  payment: Record<string, unknown>;
  profile: Record<string, unknown>;
  subscription: Record<string, unknown> | null;
};

class FakeQuery {
  constructor(private state: FakeState, private table: string) {}
  select() { return this; }
  eq() { return this; }
  neq() { return this; }
  async maybeSingle() {
    if (this.table === "askeasy_payments") return { data: { ...this.state.payment }, error: null };
    if (this.table === "profiles") return { data: { pro_until: this.state.profile.pro_until ?? null }, error: null };
    if (this.table === "askeasy_subscriptions") return { data: this.state.subscription ? { id: "sub-test" } : null, error: null };
    return { data: null, error: null };
  }
  update(value: Record<string, unknown>) {
    if (this.table === "askeasy_payments") Object.assign(this.state.payment, value);
    return this;
  }
  upsert(value: Record<string, unknown>) {
    if (this.table === "profiles") Object.assign(this.state.profile, value);
    return this;
  }
  insert(value: Record<string, unknown>) {
    if (this.table === "askeasy_subscriptions") this.state.subscription = { ...value };
    return this;
  }
  then(resolve: (value: { error: null }) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve({ error: null }).then(resolve, reject);
  }
}

function fakeAdmin(state: FakeState) {
  return {
    from: (table: string) => new FakeQuery(state, table),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: null } } }) } },
  } as never;
}

describe("Puvio centralized INR checkout", () => {
  it("creates a ₹499 INR Razorpay-routed plan request for 30 days of Pro", () => {
    const body = JSON.parse(buildPuvioCheckoutRequest({
      appId: "app-test",
      ref: "ae_request123",
      userId: "11111111-1111-4111-8111-111111111111",
      requestId: "11111111-1111-4111-8111-111111111111",
      amountMinor: 49900,
      returnUrl: "https://askeasy.ai/billing/return",
      email: "person@example.com",
    }));
    expect(body.currency).toBe("INR");
    expect(body.amount_minor).toBe(49900);
    expect(body.plan_code).toBe("pro");
    expect(body.kind).toBe("plan");
    expect(body.credits).toBe(0);
    expect(body.return_url).toBe("https://askeasy.ai/billing/return");
    expect(body.currency).not.toBe("USD");
  });

  it("adds exactly 30 days to an existing future Pro period", () => {
    const now = new Date("2026-11-18T07:00:00.000Z");
    expect(computeProRenewal(null, now).end.toISOString()).toBe("2026-12-18T07:00:00.000Z");
    expect(computeProRenewal("2026-11-25T07:00:00.000Z", now).end.toISOString()).toBe("2026-12-25T07:00:00.000Z");
  });

  it("starts a fresh 30 days when prior Pro access already expired", () => {
    const now = new Date("2026-11-18T07:00:00.000Z");
    expect(computeProRenewal("2026-10-01T07:00:00.000Z", now).end.toISOString()).toBe("2026-12-18T07:00:00.000Z");
  });

  it("rejects an invalid paid-return signature before touching payment data", async () => {
    await expect(completePuvioBillingReturn(null as never, "test-only-secret", {
      id: "session_123",
      status: "paid",
      ref: "ae_order_123",
      ts: "1763456789",
      signature: "0".repeat(64),
    })).rejects.toThrow("Invalid billing return signature.");
  });

  it("activates Pro for a valid paid return and does not add time twice on retry", async () => {
    const state: FakeState = {
      payment: {
        order_id: "ae_order_123",
        user_id: "11111111-1111-4111-8111-111111111111",
        plan_code: "pro",
        amount: 499,
        currency: "INR",
        status: "PENDING",
        payment_session_id: "session_123",
        raw_response: {},
      },
      profile: { pro_until: null, is_pro: false },
      subscription: null,
    };
    const input = { id: "session_123", status: "paid", ref: "ae_order_123", ts: "1763456789" };
    const signature = await hmacSha256Hex("test-only-secret", puvioBillingReturnPayload(input));
    const first = await completePuvioBillingReturn(fakeAdmin(state), "test-only-secret", { ...input, signature });
    expect(first.status).toBe("paid");
    expect(first.proUntil).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(state.payment.status).toBe("PAID");
    expect(state.profile.is_pro).toBe(true);
    expect(state.profile.plan).toBe("pro");
    expect(state.subscription?.provider).toBe("puvio");

    const second = await completePuvioBillingReturn(fakeAdmin(state), "test-only-secret", { ...input, signature });
    expect(second.proUntil).toBe(first.proUntil);
  });
});
