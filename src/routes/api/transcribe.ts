import { createFileRoute } from "@tanstack/react-router";

// Persona-aware biasing prompts for the transcription model.
// gpt-4o-mini-transcribe accepts a `prompt` field that steers vocabulary and style.
const PERSONA_PROMPT: Record<string, string> = {
  kid: "Casual speech from a young child. May include playful words, sound effects, or hesitations. Simple vocabulary.",
  teen: "Casual speech from a teenager. May include slang, abbreviations, and quick pacing.",
  adult: "Clear conversational speech from an adult asking a question or giving an instruction.",
  elder: "Speech from an older adult. May be slower, with pauses. Possible mixed languages. Preserve full sentences.",
};

const ALLOWED_MIME = new Set([
  "audio/webm", "audio/webm;codecs=opus",
  "audio/mp4", "audio/mp4;codecs=mp4a",
  "audio/mpeg", "audio/mp3",
  "audio/wav", "audio/x-wav", "audio/wave",
  "audio/ogg", "audio/ogg;codecs=opus",
]);

const MAX_BYTES = 20 * 1024 * 1024; // 20 MiB

function extFor(mime: string): string {
  const bare = mime.split(";")[0];
  if (bare === "audio/webm") return "webm";
  if (bare === "audio/mp4") return "mp4";
  if (bare === "audio/mpeg" || bare === "audio/mp3") return "mp3";
  if (bare === "audio/wav" || bare === "audio/x-wav" || bare === "audio/wave") return "wav";
  if (bare === "audio/ogg") return "ogg";
  return "webm";
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
            status: 500, headers: { "Content-Type": "application/json" },
          });
        }

        const form = await request.formData().catch(() => null);
        const file = form?.get("file");
        if (!(file instanceof Blob)) {
          return new Response(JSON.stringify({ error: "Missing audio file" }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }
        if (file.size < 512) {
          return new Response(JSON.stringify({ error: "Recording too short — try again." }), {
            status: 400, headers: { "Content-Type": "application/json" },
          });
        }
        if (file.size > MAX_BYTES) {
          return new Response(JSON.stringify({ error: "Recording too long" }), {
            status: 413, headers: { "Content-Type": "application/json" },
          });
        }
        const mime = (file.type || "audio/webm").toLowerCase();
        if (!ALLOWED_MIME.has(mime) && !ALLOWED_MIME.has(mime.split(";")[0])) {
          return new Response(JSON.stringify({ error: `Unsupported audio type: ${mime}` }), {
            status: 415, headers: { "Content-Type": "application/json" },
          });
        }

        const persona = String(form?.get("persona") ?? "adult");
        const language = String(form?.get("language") ?? "").trim().slice(0, 5);

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, `recording.${extFor(mime)}`);
        const bias = PERSONA_PROMPT[persona] ?? PERSONA_PROMPT.adult;
        upstream.append("prompt", bias);
        // ISO-639-1; omit if unknown/multi. "en" is safe; skip for empty.
        if (language && /^[a-z]{2}$/.test(language)) upstream.append("language", language);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          return new Response(JSON.stringify({ error: errText || `Transcription failed (${res.status})` }), {
            status: res.status, headers: { "Content-Type": "application/json" },
          });
        }

        const data = await res.json().catch(() => ({}));
        const text = typeof data?.text === "string" ? data.text.trim() : "";
        return new Response(JSON.stringify({ text }), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
