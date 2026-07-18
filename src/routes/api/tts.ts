import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type Body = { text?: string; voiceRate?: number; instructions?: string };

const FREE_VOICE_LIMIT = 2;

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey) return new Response("TTS not configured", { status: 500 });
        if (!supabaseUrl || !supabaseKey) return new Response("Server auth not configured", { status: 500 });

        // Require auth
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) return new Response("Sign in required", { status: 401 });

        const supa = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supa.auth.getUser(token);
        if (userErr || !userData?.user) return new Response("Invalid session", { status: 401 });

        // Quota (atomic check+bump)
        const { data: allowed, error: qErr } = await supa.rpc("check_and_bump_usage", {
          _kind: "voice", _n: 1, _limit: FREE_VOICE_LIMIT,
        });
        if (qErr) return new Response("Quota check failed", { status: 500 });
        if (allowed === false) return new Response("Daily voice limit reached. Upgrade to Pro.", { status: 429 });

        let body: Body;
        try { body = await request.json(); } catch { return new Response("Bad JSON", { status: 400 }); }
        const text = (body.text ?? "").toString().slice(0, 600).trim();
        if (!text) return new Response("Missing text", { status: 400 });
        const speed = Math.min(4, Math.max(0.25, Number(body.voiceRate) || 1));

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: "alloy",
            speed,
            response_format: "mp3",
            instructions: body.instructions || "Speak warmly and naturally.",
          }),
        });

        if (!upstream.ok) {
          const err = await upstream.text().catch(() => "");
          return new Response(err || "TTS failed", { status: upstream.status });
        }
        return new Response(upstream.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
