import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const phoneSchema = z.string().max(24).refine((value) => {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}, "Enter a valid mobile number with country code.");

export const updateAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ displayName: z.string().trim().min(1).max(80), phone: phoneSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string }).email ?? null;
    const { error } = await context.supabase.from("profiles").upsert(
      {
        id: context.userId,
        display_name: data.displayName,
        full_name: data.displayName,
        phone: data.phone || null,
        email,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const syncAccountPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      persona: z.enum(["kid", "teen", "adult", "elder"]),
      warmth: z.number().int().min(0).max(100),
      language: z.string().trim().min(2).max(10),
      facts: z.array(z.string().trim().min(1).max(160)).max(5),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const tone = data.warmth < 25 ? "professional and concise" : data.warmth < 55 ? "warm and focused" : data.warmth < 80 ? "friendly and encouraging" : "playful and enthusiastic";
    const { error } = await context.supabase.from("user_context").upsert(
      {
        user_id: context.userId,
        role: data.persona,
        tone,
        preferred_language: data.language,
        facts: data.facts,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const uploadAccountAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ dataUrl: z.string().max(3_000_000) }).parse(input))
  .handler(async ({ data, context }) => {
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Choose a PNG, JPG, or WebP image.");
    const binary = atob(match[2]);
    if (binary.length > 2 * 1024 * 1024) throw new Error("Choose an image smaller than 2 MB.");
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const extension = match[1] === "image/png" ? "png" : match[1] === "image/webp" ? "webp" : "jpg";
    const path = `${context.userId}/avatar-${Date.now()}.${extension}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uploaded = await supabaseAdmin.storage.from("askeasy-avatars").upload(path, bytes, {
      contentType: match[1],
      upsert: false,
      cacheControl: "31536000",
    });
    if (uploaded.error) throw new Error(uploaded.error.message);
    const avatarUrl = supabaseAdmin.storage.from("askeasy-avatars").getPublicUrl(path).data.publicUrl;
    const email = (context.claims as { email?: string }).email ?? null;
    const { error } = await context.supabase.from("profiles").upsert(
      { id: context.userId, avatar_url: avatarUrl, email, updated_at: new Date().toISOString() } as never,
      { onConflict: "id" },
    );
    if (error) throw new Error(error.message);
    return { avatarUrl };
  });

export const submitCustomerFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      kind: z.enum(["feedback", "bug", "feature", "support"]),
      subject: z.string().trim().min(2).max(160),
      message: z.string().trim().min(5).max(5000),
      rating: z.number().int().min(1).max(5).nullable(),
      contactEmail: z.union([z.string().email(), z.literal("")]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const accountEmail = (context.claims as { email?: string }).email ?? null;
    const contactEmail = data.contactEmail || accountEmail;
    const { data: row, error } = await context.supabase
      .from("askeasy_feedback" as never)
      .insert({
        user_id: context.userId,
        kind: data.kind,
        subject: data.subject,
        message: data.message,
        rating: data.rating,
        contact_email: contactEmail,
        status: "open",
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    let emailSent = false;
    try {
      const { sendMail, shell, esc, SUPPORT_EMAIL } = await import("@/lib/mailer.server");
      await sendMail({
        to: [SUPPORT_EMAIL],
        subject: `[AskEasy ${data.kind}] ${data.subject}`,
        html: shell(`New ${esc(data.kind)} request`, `
          <p><strong>From:</strong> ${esc(contactEmail ?? context.userId)}</p>
          <p><strong>Rating:</strong> ${data.rating ?? "Not provided"}</p>
          <p>${esc(data.message).replace(/\n/g, "<br/>")}</p>
        `),
        ...(contactEmail ? { reply_to: contactEmail } : {}),
      });
      emailSent = true;
    } catch (error) {
      console.error("Support notification email failed", error);
    }
    return { ok: true, id: (row as unknown as { id: string }).id, emailSent };
  });
