import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRO_MONTHLY_INR } from "@/lib/account";

const PRO_AMOUNT_INR = PRO_MONTHLY_INR;

// -------- profile, preferences, plans + today's usage --------
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [profileRes, usageRes, plansRes, subscriptionRes, rolesRes, preferencesRes] = await Promise.all([
      supabase.from("profiles").select("id, display_name, full_name, phone, avatar_url, email, is_pro, pro_until").eq("id" as never, userId).maybeSingle(),
      supabase.from("usage_daily").select("text_count, media_count, voice_count").eq("user_id", userId).eq("day", today).maybeSingle(),
      supabase.from("askeasy_plans" as never).select("code, name, price_inr, price_usd, billing_period, tagline, features, limits").eq("is_active", true).order("sort_order", { ascending: true }),
      supabase.from("askeasy_subscriptions" as never).select("plan_code, status, provider, current_period_end, cancel_at_period_end").eq("user_id", userId).order("current_period_end", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("user_roles" as never).select("role").eq("user_id", userId),
      supabase.from("user_context").select("role, tone, preferred_language, facts").eq("user_id", userId).maybeSingle(),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    if (plansRes.error) throw new Error(plansRes.error.message);
    const claims = context.claims as { email?: string; phone?: string; user_metadata?: { full_name?: string; avatar_url?: string } };
    const profile = profileRes.data as unknown as {
      id: string;
      display_name: string | null;
      full_name: string | null;
      phone: string | null;
      avatar_url: string | null;
      email: string | null;
      is_pro: boolean;
      pro_until: string | null;
    } | null;
    const usage = usageRes.data ?? { text_count: 0, media_count: 0, voice_count: 0 };
    const preferences = preferencesRes.data as unknown as { role: string | null; tone: string | null; preferred_language: string | null; facts: unknown } | null;

    return {
      profile: profile
        ? { user_id: profile.id, display_name: profile.display_name, full_name: profile.full_name, phone: profile.phone, avatar_url: profile.avatar_url, email: profile.email, is_pro: profile.is_pro, pro_until: profile.pro_until }
        : { user_id: userId, display_name: claims.user_metadata?.full_name ?? null, full_name: claims.user_metadata?.full_name ?? null, phone: claims.phone ?? null, avatar_url: claims.user_metadata?.avatar_url ?? null, email: claims.email ?? null, is_pro: false, pro_until: null },
      usage: { text: usage.text_count, media: usage.media_count, voice: usage.voice_count },
      plans: ((plansRes.data ?? []) as unknown as { code: string; name: string; price_inr: number; price_usd: number; billing_period: string; tagline: string; features: unknown; limits: Record<string, string | number | boolean | string[] | null> }[]).map((plan) => ({
        ...plan,
        features: Array.isArray(plan.features) ? plan.features.filter((feature): feature is string => typeof feature === "string") : [],
      })),
      subscription: subscriptionRes.error ? null : subscriptionRes.data,
      roles: rolesRes.error ? [] : ((rolesRes.data ?? []) as unknown as { role: string }[]).map((row) => row.role),
      preferences: preferences ? { ...preferences, facts: Array.isArray(preferences.facts) ? preferences.facts.filter((fact): fact is string => typeof fact === "string") : [] } : null,
    };
  });

// -------- messages --------
export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("messages")
      .select("id, role, content, attachments, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const AttachmentSchema = z.object({
  id: z.string(),
  type: z.enum(["image", "audio", "file"]),
  dataUrl: z.string(),
  name: z.string().optional(),
});

export const appendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().default(""),
      attachments: z.array(AttachmentSchema).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("messages")
      .insert({
        user_id: context.userId,
        role: data.role,
        content: data.content,
        attachments: data.attachments,
      })
      .select("id, role, content, attachments, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const clearMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase.from("messages").delete().eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- usage --------
export const bumpUsage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ kind: z.enum(["text", "media", "voice"]), n: z.number().int().min(1).max(20).default(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase.rpc("bump_usage", { _kind: data.kind, _n: data.n });
    if (error) throw new Error(error.message);
    return row;
  });

// -------- cashfree order --------
export const createCashfreeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const appId = process.env.CASHFREE_APP_ID;
    const secret = process.env.CASHFREE_SECRET_KEY;
    const env = (process.env.CASHFREE_ENV ?? "sandbox").toLowerCase();
    if (!appId || !secret) throw new Error("Cashfree not configured");

    const base = env === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
    const orderId = `AE${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Fetch the verified account details; never send a placeholder phone to the payment provider.
    const claims = context.claims as { email?: string; phone?: string; user_metadata?: { full_name?: string } };
    const { data: accountProfile } = await context.supabase.from("profiles").select("display_name, phone").eq("id" as never, context.userId).maybeSingle();
    const email = claims.email ?? `user_${context.userId.slice(0, 8)}@users.askeasy.ai`;
    const checkoutProfile = accountProfile as unknown as { display_name?: string | null; phone?: string | null } | null;
    const name = checkoutProfile?.display_name || claims.user_metadata?.full_name || "AskEasy User";
    const phone = (checkoutProfile?.phone || claims.phone || "").replace(/\D/g, "");
    if (phone.length < 10 || phone.length > 15) {
      throw new Error("Add a valid mobile number in Settings → Your profile before checkout.");
    }

    const returnUrl = `https://askeasy.ai/upgrade/success?order={order_id}`;

    const res = await fetch(`${base}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": "2023-08-01",
        "x-client-id": appId,
        "x-client-secret": secret,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: PRO_AMOUNT_INR,
        order_currency: "INR",
        customer_details: {
          customer_id: context.userId,
          customer_email: email,
          customer_name: name,
          customer_phone: phone,
        },
        order_meta: { return_url: returnUrl },
        order_note: "AskEasy Pro (30 days)",
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Cashfree order failed", res.status, body);
      throw new Error(body?.message || `Cashfree ${res.status}`);
    }

    // Payment rows are server-owned; the authenticated user id is taken from the verified session.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: paymentError } = await supabaseAdmin.from("payments").insert({
      user_id: context.userId,
      cashfree_order_id: orderId,
      payment_session_id: body.payment_session_id,
      amount: PRO_AMOUNT_INR,
      plan: "pro",
      environment: env,
      order_type: "one_time",
      reference_id: orderId,
      currency: "INR",
      status: "PENDING",
      raw: body,
    } as never);
    if (paymentError) throw new Error(paymentError.message);

    return {
      orderId,
      paymentSessionId: body.payment_session_id as string,
      env,
      amount: PRO_AMOUNT_INR,
    };
  });

export const getPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("payments")
      .select("status, cashfree_order_id, amount")
      .eq("user_id", context.userId)
      .eq("cashfree_order_id", data.orderId)
      .maybeSingle();
    return row ?? null;
  });
