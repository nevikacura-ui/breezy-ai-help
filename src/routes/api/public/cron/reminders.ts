import { createFileRoute } from "@tanstack/react-router";

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

        const now = Date.now();
        const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("reminders")
          .select("id, user_id, title, notes, due_at")
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
        }[];

        let pushed = 0;
        let emailed = 0;

        let undelivered = 0;

        for (const row of rows) {
          const body = row.notes?.slice(0, 300) || "Your reminder is due.";
          let delivered = false;
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
              const sentByEmail = await emailFallback(supabaseAdmin, row.user_id, row.title, body);
              if (sentByEmail) {
                emailed += 1;
                delivered = true;
              }
            }
          } catch (e) {
            console.error(`Reminder ${row.id} delivery failed:`, e);
          }
          // Only close a reminder once it actually reached the user; otherwise leave it
          // open so the next sweep retries it and it stays visible in their list.
          if (delivered) {
            await supabaseAdmin.from("reminders").update({ status: "sent" }).eq("id", row.id);
          } else {
            undelivered += 1;
          }
        }

        return Response.json({ ok: true, due: rows.length, pushed, emailed, undelivered });
      },
    },
  },
});

/** Emails the reminder when the user has no registered device. Returns true when sent. */
async function emailFallback(
  admin: { auth: { admin: { getUserById: (id: string) => Promise<any> } } },
  userId: string,
  title: string,
  body: string,
): Promise<boolean> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const resendKey = process.env["RESEND_API_KEY"];
  if (!lovableKey || !resendKey) return false;

  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email as string | undefined;
  if (!email) return false;

  const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AskEasy <askeasy@nevika.ai>",
      to: [email],
      subject: `Reminder: ${title}`,
      html: `<p><strong>${title.replace(/[<>]/g, "")}</strong></p><p>${body.replace(/[<>]/g, "")}</p>`,
    }),
  });
  if (!res.ok) {
    console.error(`Reminder email failed [${res.status}]: ${await res.text()}`);
    return false;
  }
  return true;
}
