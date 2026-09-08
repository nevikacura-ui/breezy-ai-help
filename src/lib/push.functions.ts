import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

/** Stores (or refreshes) the current device's push token for the signed-in user. */
export const registerPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        token: z.string().min(20).max(4096),
        platform: z.enum(["web", "android", "ios"]).default("web"),
        userAgent: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_tokens").upsert(
      {
        user_id: context.userId,
        token: data.token,
        platform: data.platform,
        user_agent: data.userAgent ?? null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const unregisterPushToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_tokens").delete().eq("user_id", context.userId).eq("token", data.token);
    return { ok: true };
  });

/** Sends a push notification to every device of the signed-in user. */
export const sendPushToMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(500),
        path: z.string().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connKey = process.env["FIREBASE_MESSAGING_API_KEY"];
    if (!lovableKey || !connKey) throw new Error("Push notifications are not configured.");

    const { data: rows, error } = await context.supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const tokens = (rows ?? []).map((r) => r.token as string);
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
            notification: { title: data.title, body: data.body },
            ...(data.path ? { data: { path: data.path } } : {}),
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
      await context.supabase.from("push_tokens").delete().in("token", stale).eq("user_id", context.userId);
    }
    return { sent, removed: stale.length };
  });
