export const ACCOUNT_REFRESH_EVENT = "askeasy:account-refresh";

export const PRO_MONTHLY_INR = 499;
export const FREE_DAILY_LIMITS = { text: 5, media: 2, voice: 2 } as const;

export type AccountProfile = {
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  email: string | null;
  is_pro: boolean;
  pro_until: string | null;
};

export type AccountPlan = {
  code: string;
  name: string;
  price_inr: number;
  price_usd: number;
  billing_period: string;
  tagline: string;
  features: string[];
  limits: Record<string, string | number | boolean | string[] | null>;
};

export type AccountSubscription = {
  plan_code: string;
  status: string;
  provider: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
} | null;

export type AccountPreferences = {
  role: string | null;
  tone: string | null;
  preferred_language: string | null;
  facts: string[];
} | null;

export type AccountSnapshot = {
  profile: AccountProfile;
  usage: { text: number; media: number; voice: number };
  plans: AccountPlan[];
  subscription: AccountSubscription;
  roles: string[];
  preferences: AccountPreferences;
};

export function isProfileProActive(
  profile: Pick<AccountProfile, "is_pro" | "pro_until"> | null | undefined,
  now = Date.now(),
): boolean {
  if (!profile?.is_pro) return false;
  if (!profile.pro_until) return true;
  const expires = new Date(profile.pro_until).getTime();
  return Number.isFinite(expires) && expires > now;
}

export function isSubscriptionProActive(subscription: AccountSubscription, now = Date.now()): boolean {
  if (!subscription || subscription.plan_code !== "pro") return false;
  if (!(["active", "trialing"] as const).includes(subscription.status as "active" | "trialing")) return false;
  if (!subscription.current_period_end) return true;
  const expires = new Date(subscription.current_period_end).getTime();
  return Number.isFinite(expires) && expires > now;
}

export function hasEffectivePro(
  profile: Pick<AccountProfile, "is_pro" | "pro_until"> | null | undefined,
  subscription: AccountSubscription,
  now = Date.now(),
): boolean {
  return isProfileProActive(profile, now) || isSubscriptionProActive(subscription, now);
}

export function currentPlanCode(
  profile: Pick<AccountProfile, "is_pro" | "pro_until"> | null | undefined,
  subscription: AccountSubscription,
  now = Date.now(),
): "free" | "pro" {
  return hasEffectivePro(profile, subscription, now) ? "pro" : "free";
}
