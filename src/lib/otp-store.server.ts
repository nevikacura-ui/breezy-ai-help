import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export function normalizePhone(input: string): string | null {
  const d = (input ?? "").replace(/\D/g, "");
  if (d.length === 10 && /^[6-9]/.test(d)) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  return null;
}

export function generateOtp(): string {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return String(100000 + ((b[0] ?? 0) % 900000));
}

export async function hashOtp(phone: string, code: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${phone}:${code}`));
  return Array.from(new Uint8Array(d))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export async function storeOtp(phone: string, code: string): Promise<void> {
  const code_hash = await hashOtp(phone, code);
  await supabaseAdmin
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("phone", phone)
    .is("consumed_at", null);
  await supabaseAdmin.from("otp_codes").insert({
    phone,
    code_hash,
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  });
}

export async function verifyOtp(
  phone: string,
  code: string,
): Promise<{ ok: true } | { ok: false; reason: string; status: number }> {
  const { data: row } = await supabaseAdmin
    .from("otp_codes")
    .select("id, code_hash, expires_at, attempts")
    .eq("phone", phone)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const consume = (id: string) =>
    supabaseAdmin.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", id);

  if (!row) return { ok: false, reason: "No active OTP. Request a new code.", status: 400 };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await consume(row.id);
    return { ok: false, reason: "OTP expired.", status: 400 };
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await consume(row.id);
    return { ok: false, reason: "Too many attempts. Request a new code.", status: 429 };
  }
  if ((await hashOtp(phone, code)) !== row.code_hash) {
    await supabaseAdmin.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
    const left = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    return { ok: false, reason: `Incorrect OTP. ${left} attempt(s) left.`, status: 400 };
  }
  await consume(row.id);
  return { ok: true };
}

/** THE ONLY CORRECT SEND CALL — DLT SMS template goes through the Flow API. */
export async function sendOtpSms(
  mobile: string,
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const authkey = process.env["MSG91_AUTH_KEY"];
  const template_id = process.env["MSG91_FLOW_TEMPLATE_ID"] || "6a67114083eac80188062975";
  const sender = process.env["MSG91_SENDER_ID"] || "NEVIKA";
  if (!authkey) return { ok: false, error: "OTP service not configured." };

  const res = await fetch("https://control.msg91.com/api/v5/flow/", {
    method: "POST",
    headers: { authkey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      template_id,
      sender,
      short_url: "0",
      realTimeResponse: "1",
      recipients: [{ mobiles: mobile, OTP: code, var1: code }],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { type?: string; message?: unknown };
  if (!res.ok || data.type === "error") {
    return { ok: false, error: typeof data.message === "string" ? data.message : `HTTP ${res.status}` };
  }
  return { ok: true };
}

export async function auditOtp(entry: {
  phone: string;
  action: "send" | "verify";
  status: "success" | "failed" | "rate_limited";
  error?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  context?: string | null;
}): Promise<void> {
  await supabaseAdmin.from("otp_audit").insert({
    phone: entry.phone,
    action: entry.action,
    status: entry.status,
    error: entry.error ?? null,
    ip: entry.ip ?? null,
    user_agent: entry.user_agent ?? null,
    context: entry.context ?? null,
  });
}

/** Throttle checks against successful sends recorded in otp_audit. */
export async function checkSendThrottle(
  phone: string,
  ip: string | null,
): Promise<{ ok: true } | { ok: false; reason: string; retryAfter: number }> {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60_000).toISOString();

  const { data: sends } = await supabaseAdmin
    .from("otp_audit")
    .select("created_at")
    .eq("phone", phone)
    .eq("action", "send")
    .eq("status", "success")
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false });

  const times = (sends ?? []).map((r) => new Date(r.created_at as string).getTime());
  const last = times[0];
  if (last !== undefined && now - last < 30_000) {
    return { ok: false, reason: "Please wait before requesting another code.", retryAfter: Math.ceil((30_000 - (now - last)) / 1000) };
  }
  const inHour = times.filter((t) => now - t < 60 * 60_000).length;
  if (inHour >= 5) return { ok: false, reason: "Too many codes requested. Try again later.", retryAfter: 3600 };
  if (times.length >= 10) return { ok: false, reason: "Daily limit reached. Try again tomorrow.", retryAfter: 86400 };

  if (ip) {
    const minAgo = new Date(now - 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("otp_audit")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("action", "send")
      .gte("created_at", minAgo);
    if ((count ?? 0) >= 5) return { ok: false, reason: "Too many requests. Try again in a minute.", retryAfter: 60 };
  }

  return { ok: true };
}
