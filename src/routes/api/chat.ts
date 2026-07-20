import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// Free-tier and Pro-tier model mapping.
const MODEL_MAP: Record<string, { model: string; tier: "free" | "pro" }> = {
  "askeasy/smart": { model: "google/gemini-2.5-flash", tier: "free" },
  "askeasy/eco":   { model: "openai/gpt-4o-mini",      tier: "free" },
  "askeasy/ultra": { model: "openai/gpt-4o",           tier: "pro"  },
};

// USD per 1M tokens (fallback estimate; upstream `usage.cost` is preferred when present).
const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "google/gemini-2.5-flash": { in: 0.30,  out: 2.50 },
  "openai/gpt-4o-mini":       { in: 0.15,  out: 0.60 },
  "openai/gpt-4o":            { in: 2.50,  out: 10.00 },
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

const FREE_TEXT_LIMIT = 9999; // Launch trial: effectively unlimited
const TRIAL_MS = 3 * 24 * 60 * 60 * 1000;

// --- Per-IP rate limit (in-memory ring; per-worker-instance floor) ---
const IP_WINDOW_MS = 60_000;
const IP_MAX_PER_WINDOW = 15; // ~15 requests / minute per IP
const IP_HOURLY_MAX = 120;    // hard hourly ceiling
const IP_HOUR_MS = 60 * 60_000;

type IpBucket = { minute: number[]; hour: number[] };
const ipBuckets = new Map<string, IpBucket>();

function pruneAndCheckIp(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  let b = ipBuckets.get(ip);
  if (!b) { b = { minute: [], hour: [] }; ipBuckets.set(ip, b); }
  b.minute = b.minute.filter((t) => now - t < IP_WINDOW_MS);
  b.hour = b.hour.filter((t) => now - t < IP_HOUR_MS);
  if (b.minute.length >= IP_MAX_PER_WINDOW) {
    return { allowed: false, retryAfter: Math.ceil((IP_WINDOW_MS - (now - b.minute[0])) / 1000) };
  }
  if (b.hour.length >= IP_HOURLY_MAX) {
    return { allowed: false, retryAfter: Math.ceil((IP_HOUR_MS - (now - b.hour[0])) / 1000) };
  }
  b.minute.push(now);
  b.hour.push(now);
  // Opportunistic janitor: keep the map from growing unbounded.
  if (ipBuckets.size > 5000) {
    for (const [k, v] of ipBuckets) {
      if (v.minute.length === 0 && v.hour.length === 0) ipBuckets.delete(k);
      if (ipBuckets.size < 2500) break;
    }
  }
  return { allowed: true, retryAfter: 0 };
}

function getClientIp(request: Request): string {
  const h = request.headers;
  const fwd = h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for");
  if (!fwd) return "unknown";
  return fwd.split(",")[0].trim();
}

const j = (obj: unknown, status = 200, extra?: Record<string, string>) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...(extra ?? {}) },
  });

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey) return j({ error: "OPENROUTER_API_KEY is not configured" }, 500);
        if (!supabaseUrl || !supabaseKey) return j({ error: "Server auth not configured" }, 500);

        // --- Per-IP rate limit (applies BEFORE auth so anon spam is cheap to reject) ---
        const ip = getClientIp(request);
        const rl = pruneAndCheckIp(ip);
        if (!rl.allowed) {
          return j(
            { error: "Too many requests. Please slow down.", code: "RATE_LIMITED", retryAfter: rl.retryAfter },
            429,
            { "Retry-After": String(rl.retryAfter) },
          );
        }

        // --- Require auth ---
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

        // --- Monthly spend cap (admin-side hard guard) ---
        // Uses service-role RPC so the counter isn't spoofable by users.
        const capUsd = Number(process.env.OPENROUTER_MONTHLY_CAP_USD ?? "50");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: spendSoFar } = await supabaseAdmin.rpc("get_openrouter_spend_month");
        const currentSpend = Number(spendSoFar ?? 0);
        if (Number.isFinite(capUsd) && capUsd > 0 && currentSpend >= capUsd) {
          console.warn(`[spend-cap] blocked request: month spend $${currentSpend.toFixed(4)} >= cap $${capUsd}`);
          return j(
            { error: "Service temporarily unavailable due to monthly budget cap. Please try again next month.", code: "SPEND_CAP" },
            503,
          );
        }
        // Per-model soft cap: Ultra (GPT-4o) is >6x pricier than Smart; cap at 40% of monthly budget.
        if (mapped.model === "openai/gpt-4o" && capUsd > 0) {
          const { data: ultraRow } = await supabaseAdmin
            .from("openrouter_spend")
            .select("cost_usd")
            .eq("month", new Date().toISOString().slice(0, 7))
            .eq("model", "openai/gpt-4o")
            .maybeSingle();
          const ultraSpend = Number(ultraRow?.cost_usd ?? 0);
          if (ultraSpend >= capUsd * 0.4) {
            return j(
              { error: "Ultra model is temporarily unavailable (budget cap reached). Try Smart or Eco.", code: "ULTRA_CAP" },
              503,
            );
          }
        }

        // --- Pull profile once (Pro tier + trial) ---
        const { data: profile } = await supa
          .from("profiles")
          .select("is_pro, pro_until, trial_started_at")
          .eq("user_id", userId)
          .maybeSingle();

        const proUntil = profile?.pro_until ? new Date(profile.pro_until as string).getTime() : 0;
        const isPro = !!profile?.is_pro && (proUntil === 0 || proUntil > Date.now());

        // --- LAUNCH TRIAL: all models & all languages free for everyone ---
        const LAUNCH_TRIAL = true;
        if (!LAUNCH_TRIAL) {
          if (mapped.tier === "pro" && !isPro) {
            return j({ error: "Pro subscription required for this model" }, 403);
          }
          const langCode0 = body.language ?? "en";
          const wantsLang0 = langCode0 !== "en" && !!LANG_NAMES[langCode0];
          if (wantsLang0 && !isPro) {
            const trialStart = profile?.trial_started_at
              ? new Date(profile.trial_started_at as string).getTime()
              : 0;
            const trialActive = trialStart > 0 && Date.now() - trialStart < TRIAL_MS;
            if (!trialActive) {
              return j({ error: "Language trial expired. Upgrade to Pro to continue in this language.", code: "TRIAL_EXPIRED" }, 402);
            }
          }
        }
        const langCode = body.language ?? "en";
        const wantsLang = langCode !== "en" && !!LANG_NAMES[langCode];

        // --- Free text quota (atomic check+bump) ---
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
        const upstreamBody: Record<string, unknown> = {
          model: mapped.model,
          messages: [sys, ...history],
          usage: { include: true }, // ask OpenRouter to return token + cost accounting
        };
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
        type UsageBlock = { prompt_tokens?: number; completion_tokens?: number; cost?: number };
        const data = (await upstream.json()) as {
          choices?: { message?: { content?: string; annotations?: Annotation[] } }[];
          citations?: (string | { url?: string; title?: string })[];
          usage?: UsageBlock;
        };
        const msg = data.choices?.[0]?.message;
        const reply = msg?.content ?? "";

        // --- Record spend (best-effort; failures never block the reply) ---
        try {
          const usage = data.usage ?? {};
          const promptTok = Number(usage.prompt_tokens ?? 0);
          const completionTok = Number(usage.completion_tokens ?? 0);
          let costUsd = Number(usage.cost ?? 0);
          if (!costUsd || !Number.isFinite(costUsd)) {
            const p = MODEL_PRICING[mapped.model];
            if (p) costUsd = (promptTok * p.in + completionTok * p.out) / 1_000_000;
          }
          if (Number.isFinite(costUsd) && costUsd > 0) {
            await supabaseAdmin.rpc("bump_openrouter_spend", {
              _model: mapped.model,
              _cost: costUsd,
              _prompt_tokens: promptTok,
              _completion_tokens: completionTok,
            });
          }
        } catch (e) {
          console.error("[spend-cap] failed to record spend:", e);
        }

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
