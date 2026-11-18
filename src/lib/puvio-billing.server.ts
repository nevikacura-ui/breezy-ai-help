import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PUVIO_CHECKOUT_URL } from "@/lib/puvio-config";
import {
  equalHexSignatures,
  hmacSha256Hex,
  puvioBillingReturnPayload,
  signPuvioRequest,
} from "@/lib/puvio-protocol.server";

type AdminClient = SupabaseClient<Database>;
type JsonObject = Record<string, unknown>;

export type PuvioBillingConfig = {
  appId: string;
  keyId: string;
  signingKey: string;
  returnUrl: string;
};

export type PuvioBillingReturnInput = {
  id: string;
  status: string;
  ref: string;
  ts: string;
  signature: string;
};

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function findCheckoutUrl(body: JsonObject): string | null {
  const session = objectValue(body.session);
  const data = objectValue(body.data);
  const candidate = body.checkout_url ?? body.url ?? session.checkout_url ?? session.url ?? data.checkout_url ?? data.url;
  if (typeof candidate !== "string") return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function findSessionId(body: JsonObject): string | null {
  const session = objectValue(body.session);
  const data = objectValue(body.data);
  const candidate = body.id ?? body.session_id ?? session.id ?? data.id ?? data.session_id;
  return typeof candidate === "string" && candidate.length <= 256 ? candidate : null;
}

function errorMessage(body: JsonObject, fallback: string): string {
  const error = body.error;
  if (typeof error === "string") return error.slice(0, 300);
  if (error && typeof error === "object" && typeof (error as JsonObject).message === "string") {
    return ((error as JsonObject).message as string).slice(0, 300);
  }
  if (typeof body.message === "string") return body.message.slice(0, 300);
  return fallback;
}

export function buildPuvioCheckoutRequest(input: {
  appId: string;
  ref: string;
  userId: string;
  requestId: string;
  amountMinor: number;
  returnUrl: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
}): string {
  return JSON.stringify({
    app_id: input.appId,
    ref: input.ref,
    actor_id: input.userId,
    user_id: input.userId,
    kind: "plan",
    plan_code: "pro",
    credits: 0,
    amount_minor: input.amountMinor,
    currency: "INR",
    return_url: input.returnUrl,
    success_url: input.returnUrl,
    cancel_url: input.returnUrl,
    customer: {
      id: input.userId,
      ...(input.email ? { email: input.email } : {}),
      ...(input.name ? { name: input.name } : {}),
      ...(input.phone ? { phone: input.phone } : {}),
    },
    metadata: { user_id: input.userId, plan_code: "pro", request_id: input.requestId },
  });
}

export function computeProRenewal(currentProUntil: string | null, now = new Date()): { start: Date; end: Date } {
  const current = currentProUntil ? new Date(currentProUntil) : null;
  const base = current && Number.isFinite(current.getTime()) && current > now ? current : now;
  return { start: now, end: new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000) };
}

export async function createPuvioCheckoutForUser(
  admin: AdminClient,
  config: PuvioBillingConfig,
  input: {
    userId: string;
    requestId: string;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  },
) {
  const ref = `ae_${input.requestId.replaceAll("-", "")}`;
  const { data: existing, error: existingError } = await admin
    .from("askeasy_payments" as never)
    .select("order_id, payment_session_id, status, raw_response")
    .eq("order_id", ref)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  const existingBody = objectValue((existing as { raw_response?: unknown } | null)?.raw_response);
  const existingUrl = findCheckoutUrl(existingBody);
  if (existing && existingUrl) {
    return {
      checkoutUrl: existingUrl,
      ref,
      sessionId: (existing as { payment_session_id?: string | null }).payment_session_id ?? findSessionId(existingBody),
      provider: "razorpay" as const,
      currency: "INR" as const,
    };
  }

  const { data: plan, error: planError } = await admin
    .from("askeasy_plans" as never)
    .select("code, price_inr, billing_period")
    .eq("code", "pro")
    .eq("is_active", true)
    .maybeSingle();
  if (planError) throw new Error(planError.message);
  if (!plan) throw new Error("AskEasy Pro is not available right now.");
  const amount = Number((plan as { price_inr: number }).price_inr);
  const amountMinor = Math.round(amount * 100);
  if (!Number.isFinite(amount) || amount <= 0 || !Number.isInteger(amountMinor)) {
    throw new Error("The Pro plan price is invalid.");
  }

  if (!existing) {
    const { error: insertError } = await admin.from("askeasy_payments" as never).insert({
      id: crypto.randomUUID(),
      order_id: ref,
      user_id: input.userId,
      plan_code: "pro",
      amount,
      currency: "INR",
      status: "PENDING",
      provider: "puvio",
      payment_session_id: null,
      raw_response: { request_id: input.requestId },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never);
    if (insertError) throw new Error(insertError.message);
  }

  const requestBody = buildPuvioCheckoutRequest({
    appId: config.appId,
    ref,
    userId: input.userId,
    requestId: input.requestId,
    amountMinor,
    returnUrl: config.returnUrl,
    email: input.email,
    name: input.name,
    phone: input.phone,
  });
  const path = "/api/public/billing/checkout-sessions";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const signature = await signPuvioRequest({
    secret: config.signingKey,
    timestamp,
    nonce,
    method: "POST",
    pathWithQuery: path,
    rawBody: requestBody,
  });

  const response = await fetch(PUVIO_CHECKOUT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "x-puvio-key-id": config.keyId,
      "x-puvio-timestamp": timestamp,
      "x-puvio-nonce": nonce,
      "x-puvio-signature": signature,
    },
    body: requestBody,
    redirect: "manual",
  });
  const text = await response.text();
  let body: JsonObject = {};
  try { body = objectValue(JSON.parse(text)); } catch { /* handled below */ }
  if (!response.ok) {
    await admin.from("askeasy_payments" as never).update({
      status: "FAILED",
      raw_response: { ...existingBody, provider_error: body, provider_status: response.status },
      updated_at: new Date().toISOString(),
    } as never).eq("order_id", ref);
    throw new Error(`Puvio checkout failed (${response.status}): ${errorMessage(body, "Please try again.")}`);
  }

  const checkoutUrl = findCheckoutUrl(body);
  const sessionId = findSessionId(body);
  if (!checkoutUrl || !sessionId) {
    await admin.from("askeasy_payments" as never).update({
      status: "FAILED",
      raw_response: body,
      updated_at: new Date().toISOString(),
    } as never).eq("order_id", ref);
    throw new Error("Puvio returned an incomplete checkout session.");
  }

  const { error: updateError } = await admin.from("askeasy_payments" as never).update({
    payment_session_id: sessionId,
    status: "PENDING",
    raw_response: body,
    updated_at: new Date().toISOString(),
  } as never).eq("order_id", ref);
  if (updateError) throw new Error(updateError.message);

  return { checkoutUrl, ref, sessionId, amount, provider: "razorpay" as const, currency: "INR" as const };
}

export async function completePuvioBillingReturn(
  admin: AdminClient,
  signingKey: string,
  input: PuvioBillingReturnInput,
) {
  const expected = await hmacSha256Hex(signingKey, puvioBillingReturnPayload(input));
  if (!equalHexSignatures(input.signature, expected)) throw new Error("Invalid billing return signature.");

  const { data: payment, error: paymentError } = await admin
    .from("askeasy_payments" as never)
    .select("order_id, user_id, plan_code, amount, currency, status, payment_session_id, raw_response")
    .eq("order_id", input.ref)
    .maybeSingle();
  if (paymentError) throw new Error(paymentError.message);
  if (!payment) throw new Error("This AskEasy checkout reference was not found.");
  const row = payment as unknown as {
    order_id: string;
    user_id: string;
    plan_code: string;
    amount: number;
    currency: string;
    status: string;
    payment_session_id: string | null;
    raw_response: unknown;
  };
  if (row.plan_code !== "pro" || row.currency !== "INR") throw new Error("This checkout is not an AskEasy Pro INR plan.");
  if (row.payment_session_id && row.payment_session_id !== input.id) throw new Error("Checkout session mismatch.");

  const raw = objectValue(row.raw_response);
  if (row.status === "PAID") {
    return {
      status: "paid" as const,
      planCode: "pro" as const,
      proUntil: typeof raw.activation_pro_until === "string" ? raw.activation_pro_until : null,
      ref: input.ref,
    };
  }

  if (input.status !== "paid") {
    const { error } = await admin.from("askeasy_payments" as never).update({
      status: input.status.toUpperCase(),
      payment_session_id: input.id,
      raw_response: { ...raw, billing_return: { id: input.id, status: input.status, ts: input.ts } },
      updated_at: new Date().toISOString(),
    } as never).eq("order_id", input.ref);
    if (error) throw new Error(error.message);
    return { status: input.status, planCode: "pro" as const, proUntil: null, ref: input.ref };
  }

  let proUntil = typeof raw.activation_pro_until === "string" ? raw.activation_pro_until : null;
  if (!proUntil) {
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("pro_until")
      .eq("id" as never, row.user_id)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    proUntil = computeProRenewal((profile as { pro_until?: string | null } | null)?.pro_until ?? null).end.toISOString();
    const { error: claimError } = await admin.from("askeasy_payments" as never).update({
      status: "PROCESSING",
      payment_session_id: input.id,
      raw_response: { ...raw, activation_pro_until: proUntil },
      updated_at: new Date().toISOString(),
    } as never).eq("order_id", input.ref).neq("status", "PAID");
    if (claimError) throw new Error(claimError.message);
  }

  const now = new Date().toISOString();
  const { error: profileUpdateError } = await admin.from("profiles").upsert({
    id: row.user_id,
    is_pro: true,
    plan: "pro",
    pro_until: proUntil,
    updated_at: now,
  } as never, { onConflict: "id" });
  if (profileUpdateError) throw new Error(profileUpdateError.message);

  const subscription = {
    user_id: row.user_id,
    plan_code: "pro",
    status: "active",
    provider: "puvio",
    provider_subscription_id: input.ref,
    current_period_start: now,
    current_period_end: proUntil,
    cancel_at_period_end: false,
    cancelled_at: null,
    updated_at: now,
  };
  const { data: existingSubscription, error: subscriptionLookupError } = await admin
    .from("askeasy_subscriptions" as never)
    .select("id")
    .eq("provider_subscription_id", input.ref)
    .maybeSingle();
  if (subscriptionLookupError) throw new Error(subscriptionLookupError.message);
  const subscriptionResult = existingSubscription
    ? await admin.from("askeasy_subscriptions" as never).update(subscription as never).eq("id", (existingSubscription as { id: string }).id)
    : await admin.from("askeasy_subscriptions" as never).insert({ id: crypto.randomUUID(), ...subscription, created_at: now } as never);
  if (subscriptionResult.error) throw new Error(subscriptionResult.error.message);

  const { error: paidError } = await admin.from("askeasy_payments" as never).update({
    status: "PAID",
    payment_session_id: input.id,
    provider_payment_id: input.id,
    raw_response: { ...raw, activation_pro_until: proUntil, billing_return: { id: input.id, status: input.status, ts: input.ts } },
    updated_at: now,
  } as never).eq("order_id", input.ref);
  if (paidError) throw new Error(paidError.message);

  try {
    const { data: userData } = await admin.auth.admin.getUserById(row.user_id);
    const email = userData.user?.email;
    if (email) {
      const { sendReceiptEmail } = await import("@/lib/mailer.server");
      await sendReceiptEmail({ email, orderId: input.ref, amount: row.amount, currency: "INR", proUntil });
    }
  } catch (error) {
    console.error("Puvio receipt email failed", error);
  }

  return { status: "paid" as const, planCode: "pro" as const, proUntil, ref: input.ref };
}
