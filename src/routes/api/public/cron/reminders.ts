import { createFileRoute } from "@tanstack/react-router";

/** After this many failed passes we stop retrying and tell the user it failed. */
const MAX_ATTEMPTS = 5;

/**
 * Delivery pass for due reminders. Called by a scheduled database job.
 * Protected by a shared secret header — unauthenticated callers do nothing.
 */
export const Route = createFileRoute("/api/public/cron/reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer /, "") ??
          "";
        if (provided !== secret) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendPushToUser } = await import("@/lib/push-send.server");
        const { sendReminderFailureEmail, trySendMail, shell, esc } = await import("@/lib/mailer.server");

        const now = Date.now();
        const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("reminders")
          .select("id, user_id, title, notes, due_at, delivery_attempts")
          .eq("status", "open")
          .not("due_at", "is", null)
          .lte("due_at", new Date(now).toISOString())
          .gte("due_at", since)
          .order("due_at", { ascending: true })
          .limit(100);

        if (error) {
          console.error(`Reminder sweep failed: ${error.message}`);
          return Response.json({ ok: false, error: error.message }, { status: 500 });
        }

        const rows = (data ?? []) as {
          id: string;
          user_id: string;
          title: string;
          notes: string | null;
          due_at: string;
          delivery_attempts: number | null;
        }[];

        const emailOf = async (userId: string): Promise<string | null> => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(userId);
          return (u?.user?.email as string | undefined) ?? null;
        };

        let pushed = 0;
        let emailed = 0;
        let undelivered = 0;
        let failed = 0;

        for (const row of rows) {
          const body = row.notes?.slice(0, 300) || "Your reminder is due.";
          let delivered = false;
          let lastError: string | null = null;

          try {
            const result = await sendPushToUser(supabaseAdmin as never, row.user_id, {
              title: row.title.slice(0, 120),
              body,
              path: "/bots",
            });
            if (result.sent > 0) {
              pushed += 1;
              delivered = true;
            } else {
              const email = await emailOf(row.user_id);
              if (email) {
                const ok = await trySendMail({
                  to: [email],
                  subject: `Reminder: ${row.title.slice(0, 80)}`,
                  html: shell(row.title.slice(0, 120), `<p>${esc(body)}</p>`),
                });
                if (ok) {
                  emailed += 1;
                  delivered = true;
                } else {
                  lastError = "Notification and email both failed.";
                }
              } else {
                lastError = "No registered device and no email address on file.";
              }
            }
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            console.error(`Reminder ${row.id} delivery failed:`, e);
          }

          // Only close a reminder once it actually reached the user; otherwise leave it
          // open so the next sweep retries it and it stays visible in their list.
          if (delivered) {
            await supabaseAdmin
              .from("reminders")
              .update({ status: "sent", last_attempt_at: new Date().toISOString(), last_error: null })
              .eq("id", row.id);
            continue;
          }

          const attempts = (row.delivery_attempts ?? 0) + 1;
          const giveUp = attempts >= MAX_ATTEMPTS;
          await supabaseAdmin
            .from("reminders")
            .update({
              delivery_attempts: attempts,
              last_attempt_at: new Date().toISOString(),
              last_error: lastError ?? "Delivery failed.",
              ...(giveUp ? { status: "failed" } : {}),
            })
            .eq("id", row.id);

          if (giveUp) {
            failed += 1;
            const email = await emailOf(row.user_id);
            if (email) await sendReminderFailureEmail(email, row.title);
          } else {
            undelivered += 1;
          }
        }

        return Response.json({ ok: true, due: rows.length, pushed, emailed, undelivered, failed });
      },
    },
  },
});
