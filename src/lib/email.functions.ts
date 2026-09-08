import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

/** Sender identity for all AskEasy transactional mail. */
export const FROM_EMAIL = "AskEasy <askeasy@nevika.ai>";
export const SUPPORT_EMAIL = "askeasy@nevika.ai";

async function send(payload: {
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
}): Promise<{ id?: string }> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) throw new Error("Email is not configured.");

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Resend request failed [${res.status}]: ${text}`);
    throw new Error(`Email send failed [${res.status}]: ${text}`);
  }
  return (await res.json()) as { id?: string };
}

/** Sends a message to the signed-in user's own verified email address. */
export const emailMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        subject: z.string().min(1).max(200),
        html: z.string().min(1).max(100_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string })?.email;
    if (!email) throw new Error("No email address on this account.");
    const out = await send({ to: [email], subject: data.subject, html: data.html });
    return { ok: true, id: out.id ?? null };
  });

/** Sends a support/contact request to the AskEasy inbox. */
export const emailSupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ subject: z.string().min(1).max(200), message: z.string().min(1).max(10_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const email = (context.claims as { email?: string })?.email;
    const html = `<p><strong>From:</strong> ${email ?? context.userId}</p><p>${data.message
      .replace(/[<>]/g, "")
      .replace(/\n/g, "<br/>")}</p>`;
    const out = await send({
      to: [SUPPORT_EMAIL],
      subject: `[AskEasy] ${data.subject}`,
      html,
      ...(email ? { reply_to: email } : {}),
    });
    return { ok: true, id: out.id ?? null };
  });
