import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const EventSchema = z.object({
  event: z.enum(["category_select", "category_deselect", "onboarding_complete"]),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  session_id: z.string().max(64).default("anonymous"),
  path: z.string().max(200).default("/"),
  at: z.string().max(40).optional(),
});

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return new Response("bad request", { status: 400 });
        }
        const parsed = EventSchema.safeParse(json);
        if (!parsed.success) {
          return new Response("invalid event", { status: 422 });
        }
        const { event, properties, session_id, path } = parsed.data;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("analytics_events").insert({
            event,
            properties,
            session_id,
            path,
          });
          if (error) {
            console.error("analytics insert failed:", error.message);
            return new Response("store failed", { status: 500 });
          }
        } catch (err) {
          console.error("analytics error:", err);
          return new Response("store failed", { status: 500 });
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
