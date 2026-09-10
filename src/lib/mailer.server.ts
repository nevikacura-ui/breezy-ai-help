/** Shared Resend sender for every AskEasy transactional email. Server-only. */

export const FROM_EMAIL = "AskEasy <askeasy@nevika.ai>";
export const SUPPORT_EMAIL = "askeasy@nevika.ai";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

export type MailPayload = {
  to: string[];
  subject: string;
  html: string;
  reply_to?: string;
};

/** Sends mail. Returns false (never throws) when email is not configured or the provider rejects it. */
export async function trySendMail(payload: MailPayload): Promise<boolean> {
  try {
    await sendMail(payload);
    return true;
  } catch (e) {
    console.error("Email send failed:", e);
    return false;
  }
}

export async function sendMail(payload: MailPayload): Promise<{ id?: string }> {
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

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Minimal branded wrapper so every email looks like AskEasy. */
export function shell(heading: string, bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#fcf6ee;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:28px">
    <h1 style="margin:0 0 12px;font-size:20px;color:#171410">${esc(heading)}</h1>
    <div style="font-size:15px;line-height:1.6;color:#3c352c">${bodyHtml}</div>
    <p style="margin-top:24px;font-size:12px;color:#8a8177">AskEasy · <a href="https://askeasy.ai" style="color:#8a8177">askeasy.ai</a> · <a href="mailto:${SUPPORT_EMAIL}" style="color:#8a8177">${SUPPORT_EMAIL}</a></p>
  </div>
</div>`;
}

/** Welcome mail for a brand-new account. */
export async function sendWelcomeEmail(email: string, name?: string | null): Promise<boolean> {
  return trySendMail({
    to: [email],
    subject: "Welcome to AskEasy",
    html: shell(`Welcome${name ? `, ${esc(name)}` : ""}!`, `
      <p>Your AskEasy account is ready. Pick a character, ask anything, and it remembers what matters to you.</p>
      <ul>
        <li>Chat by text or by holding the mic.</li>
        <li>Set reminders and get them by notification or email.</li>
        <li>Switch languages any time in Settings.</li>
      </ul>
      <p><a href="https://askeasy.ai" style="display:inline-block;margin-top:8px;background:#171410;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none">Open AskEasy</a></p>
    `),
  });
}

/** Payment receipt after a successful upgrade. */
export async function sendReceiptEmail(args: {
  email: string;
  orderId: string;
  amount?: number | null;
  currency?: string | null;
  proUntil: string;
}): Promise<boolean> {
  const amount =
    args.amount != null ? `${args.currency ?? "INR"} ${Number(args.amount).toFixed(2)}` : "—";
  return trySendMail({
    to: [args.email],
    subject: "Your AskEasy Pro receipt",
    html: shell("Payment received", `
      <p>Thanks for upgrading to AskEasy Pro.</p>
      <table style="font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#8a8177">Amount</td><td>${esc(amount)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#8a8177">Order</td><td>${esc(args.orderId)}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#8a8177">Pro until</td><td>${esc(new Date(args.proUntil).toDateString())}</td></tr>
      </table>
      <p style="margin-top:16px">Cancel any time in Settings → Subscription. Refund policy: <a href="https://askeasy.ai/legal/refunds">askeasy.ai/legal/refunds</a>.</p>
    `),
  });
}

/** Tells the user a reminder could not be delivered after repeated attempts. */
export async function sendReminderFailureEmail(email: string, title: string): Promise<boolean> {
  return trySendMail({
    to: [email],
    subject: `We couldn't deliver your reminder: ${title.slice(0, 80)}`,
    html: shell("Reminder not delivered", `
      <p>We tried several times to deliver this reminder and couldn't reach your device:</p>
      <p><strong>${esc(title)}</strong></p>
      <p>Turn on notifications in Settings so future reminders reach you instantly.</p>
    `),
  });
}
