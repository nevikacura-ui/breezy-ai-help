import { describe, expect, it } from "vitest";
import { MODELS, FREE_LIMITS } from "./askeasy";
import {
  FREE_DAILY_LIMITS,
  PRO_MONTHLY_INR,
  currentPlanCode,
  isProfileProActive,
  isSubscriptionProActive,
} from "./account";

describe("customer plan rules", () => {
  it("keeps the Free daily allowance at 5 text, 2 media, and 2 voice messages", () => {
    expect(FREE_DAILY_LIMITS).toEqual({ text: 5, media: 2, voice: 2 });
    expect(FREE_LIMITS).toEqual(FREE_DAILY_LIMITS);
  });

  it("keeps Pro priced at ₹499 per month", () => {
    expect(PRO_MONTHLY_INR).toBe(499);
  });

  it("reserves Ultra for Pro while Smart and Eco stay free", () => {
    expect(MODELS.find((model) => model.id === "askeasy/ultra")?.tier).toBe("pro");
    expect(MODELS.find((model) => model.id === "askeasy/smart")?.tier).toBe("free");
    expect(MODELS.find((model) => model.id === "askeasy/eco")?.tier).toBe("free");
  });

  it("expires Pro access at pro_until", () => {
    const now = Date.UTC(2026, 10, 18);
    expect(isProfileProActive({ is_pro: true, pro_until: "2026-11-19T00:00:00Z" }, now)).toBe(true);
    expect(isProfileProActive({ is_pro: true, pro_until: "2026-11-17T00:00:00Z" }, now)).toBe(false);
  });

  it("reflects an active Pro subscription even before the profile projection catches up", () => {
    const now = Date.UTC(2026, 10, 18);
    const subscription = {
      plan_code: "pro",
      status: "active",
      provider: "cashfree",
      current_period_end: "2026-12-18T00:00:00Z",
      cancel_at_period_end: false,
    };
    expect(isSubscriptionProActive(subscription, now)).toBe(true);
    expect(currentPlanCode({ is_pro: false, pro_until: null }, subscription, now)).toBe("pro");
  });
});
