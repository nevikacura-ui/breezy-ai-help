import { createFileRoute } from "@tanstack/react-router";

type Body = {
  name?: string;
  role?: string;
  goals?: string;
  tone?: string;
};

type GeneratedPersona = {
  greeting: string;
  starters: { title: string; hint: string; emoji: string }[];
  tagline: string;
};

const FALLBACK: GeneratedPersona = {
  greeting: "Hey! I'm here whenever you're ready. What's on your mind?",
  starters: [
    { title: "Where should we start?", hint: "Pick a first goal and I'll guide you.", emoji: "🚀" },
    { title: "Give me a quick win", hint: "A small task to build momentum.", emoji: "✨" },
    { title: "Explain something", hint: "Any topic — I'll keep it simple.", emoji: "💡" },
  ],
  tagline: "Your personal assistant",
};

export const Route = createFileRoute("/api/bot-generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return json({ error: "OPENROUTER_API_KEY not configured", ...FALLBACK }, 500);
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON", ...FALLBACK }, 400);
        }

        const name = (body.name ?? "Your bot").trim() || "Your bot";
        const role = (body.role ?? "").trim();
        const goals = (body.goals ?? "").trim();
        const tone = (body.tone ?? "warm and casual").trim() || "warm and casual";

        const sys = `You are a persona designer for AI chatbots. Given a bot name, role, user goals, and tone, produce a JSON object with:
- "tagline": one short line under 8 words describing the bot.
- "greeting": a friendly first message (1-2 sentences, first person as the bot). Acknowledge the user's goals naturally, matching the tone. No emojis at the start.
- "starters": array of exactly 3 objects with "title" (short, actionable, under 6 words), "hint" (one clear sentence), and "emoji" (single emoji). Each starter must map to a distinct goal or an early step toward one.
Return only valid JSON, no markdown fences.`;

        const user = `Bot name: ${name}
Role: ${role || "(unspecified)"}
User goals: ${goals || "(none provided)"}
Tone: ${tone}`;

        try {
          const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://askeasy.lovable.app",
              "X-Title": "AskEasy",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: sys },
                { role: "user", content: user },
              ],
              response_format: { type: "json_object" },
            }),
          });

          if (!upstream.ok) {
            return json({ error: "Upstream error", ...FALLBACK }, 200);
          }
          const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
          const raw = data.choices?.[0]?.message?.content ?? "";
          const cleaned = raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
          const parsed = JSON.parse(cleaned) as Partial<GeneratedPersona>;

          const starters = Array.isArray(parsed.starters) ? parsed.starters.slice(0, 3) : [];
          while (starters.length < 3) starters.push(FALLBACK.starters[starters.length]);

          return json({
            tagline: (parsed.tagline ?? FALLBACK.tagline).toString().slice(0, 60),
            greeting: (parsed.greeting ?? FALLBACK.greeting).toString().slice(0, 400),
            starters: starters.map((s, i) => ({
              title: (s.title ?? FALLBACK.starters[i].title).toString().slice(0, 60),
              hint: (s.hint ?? FALLBACK.starters[i].hint).toString().slice(0, 140),
              emoji: (s.emoji ?? FALLBACK.starters[i].emoji).toString().slice(0, 4),
            })),
          }, 200);
        } catch {
          return json(FALLBACK, 200);
        }
      },
    },
  },
});

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
