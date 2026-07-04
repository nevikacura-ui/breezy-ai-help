import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PRO_AMOUNT_INR = 499; // Pro plan monthly (edit here to change price everywhere)

// -------- profile + today's usage --------
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const [profileRes, usageRes] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, is_pro, pro_until").eq("user_id", userId).maybeSingle(),
      supabase.from("usage_daily").select("text_count, media_count, voice_count").eq("user_id", userId).eq("day", today).maybeSingle(),
    ]);

    if (profileRes.error) throw new Error(profileRes.error.message);
    const usage = usageRes.data ?? { text_count: 0, media_count: 0, voice_count: 0 };

    return {
      profile: profileRes.data ?? { user_id: userId, display_name: null, is_pro: false, pro_until: null },
      usage: { text: usage.text_count, media: usage.media_count, voice: usage.voice_count },
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

    // Fetch email/name from auth for a nicer checkout
    const email = (context.claims as { email?: string })?.email ?? `user_${context.userId.slice(0, 8)}@askeasy.app`;
    const name = (context.claims as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name ?? "AskEasy User";

    const returnUrl = `https://project--14b98f02-993b-4e85-a0aa-3c3bd478b75d.lovable.app/upgrade/success?order={order_id}`;

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
          customer_phone: "9999999999",
        },
        order_meta: { return_url: returnUrl },
        order_note: "AskEasy Pro (monthly)",
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Cashfree order failed", res.status, body);
      throw new Error(body?.message || `Cashfree ${res.status}`);
    }

    // Persist the pending payment
    await context.supabase.from("payments").insert({
      user_id: context.userId,
      cashfree_order_id: orderId,
      payment_session_id: body.payment_session_id,
      amount: PRO_AMOUNT_INR,
      currency: "INR",
      status: "PENDING",
      raw: body,
    });

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
