import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/cashfree-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.CASHFREE_SECRET_KEY;
        const rawBody = await request.text();
        const signature = request.headers.get("x-webhook-signature") ?? "";
        const timestamp = request.headers.get("x-webhook-timestamp") ?? "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let verified = false;
        if (secret && signature && timestamp) {
          const expected = createHmac("sha256", secret).update(`${timestamp}${rawBody}`).digest("base64");
          const a = Buffer.from(signature);
          const b = Buffer.from(expected);
          verified = a.length === b.length && timingSafeEqual(a, b);
        }

        // Always audit
        let parsed: Record<string, unknown> | null = null;
        try { parsed = JSON.parse(rawBody) as Record<string, unknown>; } catch { /* ignore */ }

        // Idempotency key: prefer provider event id, fall back to timestamp+order
        const orderIdEarly = (parsed as { data?: { order?: { order_id?: string } } })?.data?.order?.order_id;
        const eventId =
          ((parsed as { event_id?: string })?.event_id) ||
          ((parsed as { data?: { payment?: { cf_payment_id?: string | number } } })?.data?.payment?.cf_payment_id?.toString()) ||
          (timestamp && orderIdEarly ? `${timestamp}:${orderIdEarly}` : null);

        const insertRes = await supabaseAdmin.from("webhook_events").insert({
          source: "cashfree",
          event_id: eventId,
          event_type: (parsed?.type as string | undefined) ?? null,
          status: verified ? "verified" : "signature_failed",
          payload: parsed as never,
        });

        // Duplicate delivery → ack without re-processing
        if (insertRes.error && (insertRes.error as { code?: string }).code === "23505") {
          return new Response("ok (duplicate)");
        }

        if (!verified) return new Response("Invalid signature", { status: 401 });

        const evt = parsed as {
          type?: string;
          data?: { order?: { order_id?: string; order_status?: string }; payment?: { payment_status?: string } };
        };
        const orderId = evt?.data?.order?.order_id;
        const status = evt?.data?.payment?.payment_status ?? evt?.data?.order?.order_status ?? "UNKNOWN";

        if (orderId) {
          // Only promote if not already promoted for this order
          const { data: existing } = await supabaseAdmin
            .from("payments")
            .select("user_id, status")
            .eq("cashfree_order_id", orderId)
            .maybeSingle();

          const alreadyPaid = existing?.status === "SUCCESS" || existing?.status === "PAID";

          await supabaseAdmin
            .from("payments")
            .update({ status, raw: parsed as never, updated_at: new Date().toISOString() })
            .eq("cashfree_order_id", orderId);

          if (existing && !alreadyPaid && (status === "SUCCESS" || status === "PAID")) {
            const proUntil = new Date();
            proUntil.setMonth(proUntil.getMonth() + 1);
            await supabaseAdmin
              .from("profiles")
              .update({ is_pro: true, pro_until: proUntil.toISOString(), updated_at: new Date().toISOString() })
              .eq("user_id", existing.user_id);
          }
        }

        return new Response("ok");
      },
    },
  },
});
