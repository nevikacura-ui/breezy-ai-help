import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";


// Map friendly tier IDs → OpenRouter model slugs.
// Free tier: kept cheap on purpose (Gemini Flash + GPT-4o-mini).
// Pro tier: higher-cost, higher-capability models.
const MODEL_MAP: Record<string, { model: string; tier: "free" | "pro" }> = {
  "askeasy/smart": { model: "google/gemini-2.5-flash", tier: "free" },
  "askeasy/eco": { model: "openai/gpt-4o-mini", tier: "free" },
  "askeasy/ultra": { model: "openai/gpt-4o", tier: "pro" },
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatRequestBody = {
  messages?: ChatMessage[];
  model?: string;
  language?: string;
};

const LANG_NAMES: Record<string, string> = {
  en: "English", hi: "Hindi", bn: "Bengali", ta: "Tamil", te: "Telugu",
  mr: "Marathi", gu: "Gujarati", kn: "Kannada", ml: "Malayalam",
  pa: "Punjabi", ur: "Urdu", or: "Odia", as: "Assamese",
  mai: "Maithili", bho: "Bhojpuri", ne: "Nepali", sa: "Sanskrit",
  kok: "Konkani", doi: "Dogri", sd: "Sindhi", ks: "Kashmiri",
  brx: "Bodo", sat: "Santali", mni: "Manipuri",
};

const LANG_SCRIPTS: Record<string, string> = {
  hi: "Devanagari", mai: "Devanagari", bho: "Devanagari", ne: "Devanagari",
  sa: "Devanagari", kok: "Devanagari", doi: "Devanagari", brx: "Devanagari",
  mr: "Devanagari",
  bn: "Bengali", as: "Bengali",
  ta: "Tamil", te: "Telugu", kn: "Kannada", ml: "Malayalam",
  gu: "Gujarati", pa: "Gurmukhi", or: "Odia",
  ur: "Perso-Arabic (Nastaliq)", ks: "Perso-Arabic (Nastaliq)", sd: "Perso-Arabic",
  sat: "Ol Chiki", mni: "Meitei Mayek",
};

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: ChatRequestBody;
        try {
          body = (await request.json()) as ChatRequestBody;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const modelId = body.model ?? "askeasy/smart";
        const mapped = MODEL_MAP[modelId] ?? MODEL_MAP["askeasy/smart"];

        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Server-side Pro gating for pro-tier models.
        // Anonymous users may only use free-tier models. Signed-in users
        // must have profiles.is_pro=true and an unexpired pro_until.
        if (mapped.tier === "pro") {
          const authHeader = request.headers.get("authorization") ?? "";
          const token = authHeader.toLowerCase().startsWith("bearer ")
            ? authHeader.slice(7).trim()
            : "";
          if (!token) {
            return new Response(
              JSON.stringify({ error: "Sign in required for Pro models" }),
              { status: 401, headers: { "Content-Type": "application/json" } },
            );
          }
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !supabaseKey) {
            return new Response(
              JSON.stringify({ error: "Server auth not configured" }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          }
          const supabase = createClient(supabaseUrl, supabaseKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: userData, error: userErr } = await supabase.auth.getUser(token);
          if (userErr || !userData?.user) {
            return new Response(JSON.stringify({ error: "Invalid session" }), {
              status: 401, headers: { "Content-Type": "application/json" },
            });
          }
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_pro, pro_until")
            .eq("user_id", userData.user.id)
            .maybeSingle();
          const proUntil = profile?.pro_until ? new Date(profile.pro_until as string).getTime() : 0;
          const isPro = !!profile?.is_pro && (proUntil === 0 || proUntil > Date.now());
          if (!isPro) {
            return new Response(
              JSON.stringify({ error: "Pro subscription required for this model" }),
              { status: 403, headers: { "Content-Type": "application/json" } },
            );
          }
        }

        const upstream = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://askeasy.lovable.app",
              "X-Title": "AskEasy",
            },
            body: JSON.stringify({
              model: mapped.model,
              messages: (() => {
                const langCode = body.language;
                const langName = langCode ? LANG_NAMES[langCode] : undefined;
                const script = langCode ? LANG_SCRIPTS[langCode] : undefined;
                const wantsLang = !!langName && langCode !== "en";
                const langLine = wantsLang
                  ? ` OUTPUT LANGUAGE RULE (non-negotiable): You MUST write every response entirely in ${langName}${script ? ` using ${script} script` : ""}. This applies even when the user's question is in English, Hindi, or any other language — translate your answer into ${langName} before replying. Do not answer in English. Do not mix languages. Keep proper nouns and code identifiers as-is.`
                  : "";
                const sys = {
                  role: "system" as const,
                  content:
                    "You are AskEasy, a warm, concise, helpful assistant. Answer clearly using markdown when useful." +
                    langLine,
                };
                const mapped = messages.map((m) => ({ role: m.role, content: m.content }));
                if (wantsLang && mapped.length > 0) {
                  const last = mapped[mapped.length - 1];
                  if (last.role === "user") {
                    last.content = `${last.content}\n\n[Reply strictly in ${langName}${script ? ` (${script} script)` : ""}.]`;
                  }
                }
                return [sys, ...mapped];
              })(),
            }),
          },
        );

        if (!upstream.ok) {
          const errText = await upstream.text();
          return new Response(
            JSON.stringify({
              error: "Upstream error",
              status: upstream.status,
              detail: errText.slice(0, 500),
            }),
            {
              status: upstream.status,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const data = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const reply = data.choices?.[0]?.message?.content ?? "";

        return new Response(
          JSON.stringify({ reply, model: mapped.model, tier: mapped.tier }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
