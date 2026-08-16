import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Executes an approved tool call. This is the ONLY path that can run a tool the
// user had to approve: the chat route returns a proposal, the user taps Approve,
// and the client replays the exact call here.

const j = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

type Body = { tool?: string; input?: Record<string, unknown>; approved?: boolean };

export const Route = createFileRoute("/api/tools")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) return j({ error: "Server auth not configured" }, 500);

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) return j({ error: "Sign in required" }, 401);

        const supa = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supa.auth.getUser(token);
        if (userErr || !userData?.user) return j({ error: "Invalid session" }, 401);
        const userId = userData.user.id;

        let body: Body;
        try { body = (await request.json()) as Body; } catch { return j({ error: "Invalid JSON" }, 400); }
        if (!body.tool) return j({ error: "tool required" }, 400);

        const { executeTool } = await import("@/lib/tools/execute.server");
        const result = await executeTool(body.tool, body.input ?? {}, {
          userId,
          approved: body.approved === true,
        });
        return j(result, result.ok ? 200 : 200);
      },
    },
  },
});
