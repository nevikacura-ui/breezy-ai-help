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
    const { sendPushToUser } = await import("@/lib/push-send.server");
    return sendPushToUser(context.supabase, context.userId, data);
  });
