import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sender identity for all AskEasy transactional mail. */
export const FROM_EMAIL = "AskEasy <askeasy@nevika.ai>";
export const SUPPORT_EMAIL = "askeasy@nevika.ai";

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
    const { sendMail } = await import("@/lib/mailer.server");
    const out = await sendMail({ to: [email], subject: data.subject, html: data.html });
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
    const { sendMail, shell, esc } = await import("@/lib/mailer.server");
    const html = shell(`[AskEasy] ${data.subject}`, `
      <p><strong>From:</strong> ${esc(email ?? context.userId)}</p>
      <p>${esc(data.message).replace(/\n/g, "<br/>")}</p>
    `);
    const out = await sendMail({
      to: [SUPPORT_EMAIL],
      subject: `[AskEasy] ${data.subject}`,
      html,
      ...(email ? { reply_to: email } : {}),
    });
    return { ok: true, id: out.id ?? null };
  });
