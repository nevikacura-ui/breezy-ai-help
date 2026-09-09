// Shared Firebase Cloud Messaging sender. Server-only.
import type { SupabaseClient } from "@supabase/supabase-js";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export type PushSendResult = { sent: number; removed: number };

/**
 * Sends one notification to every registered device of a user.
 * `db` must be a client that can read/delete that user's push_tokens rows.
 */
export async function sendPushToUser(
  db: SupabaseClient<any, any, any>,
  userId: string,
  payload: { title: string; body: string; path?: string },
): Promise<PushSendResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["FIREBASE_MESSAGING_API_KEY"];
  if (!lovableKey || !connKey) throw new Error("Push notifications are not configured.");

  const { data: rows, error } = await db.from("push_tokens").select("token").eq("user_id", userId);
  if (error) throw new Error(error.message);
  const tokens = (rows ?? []).map((r: { token: string }) => r.token);
  if (tokens.length === 0) return { sent: 0, removed: 0 };

  let sent = 0;
  const stale: string[] = [];

  for (const token of tokens) {
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: payload.title, body: payload.body },
          ...(payload.path ? { data: { path: payload.path } } : {}),
        },
      }),
    });
    if (res.ok) {
      sent += 1;
      continue;
    }
    const text = await res.text();
    if (res.status === 404 || res.status === 400) stale.push(token);
    else console.error(`FCM send failed [${res.status}]: ${text}`);
  }

  if (stale.length) {
    await db.from("push_tokens").delete().in("token", stale).eq("user_id", userId);
  }
  return { sent, removed: stale.length };
}
