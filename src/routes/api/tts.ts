import { createFileRoute } from "@tanstack/react-router";

type Body = { text?: string; voiceRate?: number; instructions?: string };

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("TTS not configured", { status: 500 });

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
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
