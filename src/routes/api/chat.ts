import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Free-tier and Pro-tier model mapping.
const MODEL_MAP: Record<string, { model: string; tier: "free" | "pro" }> = {
  "askeasy/smart": { model: "google/gemini-2.5-flash", tier: "free" },
  "askeasy/eco":   { model: "openai/gpt-4o-mini",      tier: "free" },
  "askeasy/ultra": { model: "openai/gpt-4o",           tier: "pro"  },
};

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type ChatRequestBody = { messages?: ChatMessage[]; model?: string; language?: string; system?: string; webSearch?: boolean };

const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  it: "Italian", ar: "Arabic", hi: "Hindi", zh: "Chinese (Simplified)", ja: "Japanese",
};

const LANG_SCRIPTS: Record<string, string> = {
  ar: "Arabic script",
  hi: "Devanagari",
  zh: "Simplified Chinese characters",
  ja: "Japanese script (Kanji + Kana)",
};

const FREE_TEXT_LIMIT = 5;
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

const j = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey) return j({ error: "OPENROUTER_API_KEY is not configured" }, 500);
        if (!supabaseUrl || !supabaseKey) return j({ error: "Server auth not configured" }, 500);

        // --- Require auth (Phase 1 blocker #4) ---
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

        let body: ChatRequestBody;
        try { body = (await request.json()) as ChatRequestBody; } catch { return j({ error: "Invalid JSON" }, 400); }

        const modelId = body.model ?? "askeasy/smart";
        const mapped = MODEL_MAP[modelId] ?? MODEL_MAP["askeasy/smart"];
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (messages.length === 0) return j({ error: "messages required" }, 400);

        // --- Pull profile once (Pro tier + trial) ---
        const { data: profile } = await supa
          .from("profiles")
          .select("is_pro, pro_until, trial_started_at")
          .eq("user_id", userId)
          .maybeSingle();

        const proUntil = profile?.pro_until ? new Date(profile.pro_until as string).getTime() : 0;
        const isPro = !!profile?.is_pro && (proUntil === 0 || proUntil > Date.now());

        // --- Pro-tier model gate ---
        if (mapped.tier === "pro" && !isPro) {
          return j({ error: "Pro subscription required for this model" }, 403);
        }

        // --- Language trial gate (Phase 1 blocker #2) ---
        const langCode = body.language ?? "en";
        const wantsLang = langCode !== "en" && !!LANG_NAMES[langCode];
        if (wantsLang && !isPro) {
          const trialStart = profile?.trial_started_at
            ? new Date(profile.trial_started_at as string).getTime()
            : 0;
          const trialActive = trialStart > 0 && Date.now() - trialStart < TRIAL_MS;
          if (!trialActive) {
            return j({ error: "Language trial expired. Upgrade to Pro to continue in this language.", code: "TRIAL_EXPIRED" }, 402);
          }
        }

        // --- Free text quota (Phase 1 blocker #1): atomic check+bump ---
        const { data: allowed, error: quotaErr } = await supa.rpc("check_and_bump_usage", {
          _kind: "text",
          _n: 1,
          _limit: FREE_TEXT_LIMIT,
        });
        if (quotaErr) {
          console.error("check_and_bump_usage failed", quotaErr);
          return j({ error: "Quota check failed" }, 500);
        }
        if (allowed === false) {
          return j({ error: "Daily free limit reached. Upgrade to Pro for unlimited chats.", code: "QUOTA_EXCEEDED" }, 429);
        }

        // --- Build request ---
        const langName = LANG_NAMES[langCode] ?? "English";
        const script = LANG_SCRIPTS[langCode];
        const langLine = wantsLang
          ? ` OUTPUT LANGUAGE RULE (non-negotiable): Write every response entirely in ${langName}${script ? ` using ${script}` : ""}. Even if the user types in English, translate your answer into ${langName}. Do not mix languages. Keep proper nouns and code identifiers as-is.`
          : " OUTPUT LANGUAGE RULE: Reply in English.";

        const persona = (body.system ?? "").trim();
        const sys: ChatMessage = {
          role: "system",
          content:
            (persona || "You are AskEasy, a warm, concise, helpful assistant. Answer clearly using markdown when useful.") +
            langLine,
        };

        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        if (wantsLang && history.length > 0) {
          const last = history[history.length - 1];
          if (last.role === "user") {
            last.content = `${last.content}\n\n[Reply strictly in ${langName}${script ? ` (${script})` : ""}.]`;
          }
        }

        const useWebSearch = !!body.webSearch;
        const upstreamBody: Record<string, unknown> = { model: mapped.model, messages: [sys, ...history] };
        if (useWebSearch) upstreamBody.plugins = [{ id: "web", max_results: 5 }];

        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://askeasy.lovable.app",
            "X-Title": "AskEasy",
          },
          body: JSON.stringify(upstreamBody),
        });

        if (!upstream.ok) {
          const errText = await upstream.text();
          return j({ error: "Upstream error", status: upstream.status, detail: errText.slice(0, 500) }, upstream.status);
        }

        type Annotation = { type?: string; url_citation?: { url?: string; title?: string } };
        const data = (await upstream.json()) as {
          choices?: { message?: { content?: string; annotations?: Annotation[] } }[];
          citations?: (string | { url?: string; title?: string })[];
        };
        const msg = data.choices?.[0]?.message;
        const reply = msg?.content ?? "";

        const citations: { title?: string; url: string }[] = [];
        const seen = new Set<string>();
        for (const a of msg?.annotations ?? []) {
          const c = a?.url_citation;
          if (c?.url && !seen.has(c.url)) { seen.add(c.url); citations.push({ url: c.url, title: c.title }); }
        }
        for (const c of data.citations ?? []) {
          const url = typeof c === "string" ? c : c?.url;
          const title = typeof c === "string" ? undefined : c?.title;
          if (url && !seen.has(url)) { seen.add(url); citations.push({ url, title }); }
        }

        return j({ reply, model: mapped.model, tier: mapped.tier, citations });
      },
    },
  },
});
