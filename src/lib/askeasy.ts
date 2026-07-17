import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LangCode } from "./i18n";
import { t as translate } from "./i18n";

export type Attachment = {
  id: string;
  type: "image" | "audio" | "file";
  dataUrl: string;
  name?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: Attachment[];
  createdAt: number;
};

export type Theme = "light" | "dark" | "system";
export type Persona = "kid" | "teen" | "adult" | "elder";
export type Mood = "great" | "good" | "meh" | "down" | null;

export type Settings = {
  name: string;
  theme: Theme;
  voiceEnabled: boolean;
  openRouterModel: string;
  isPro: boolean;
  language: LangCode;
  /** Timestamp (ms) when the user first switched to a non-English language. */
  trialStartedAt: number | null;

  // Personalization
  persona: Persona;
  /** 0=professional, 50=friendly, 100=playful */
  warmth: number;
  /** Free-form facts the bot should remember: "loves cricket", etc. */
  aboutMe: string[];
  mood: Mood;
  /** ISO date (YYYY-MM-DD) of last active day for streaks */
  lastActiveDate: string | null;
  streakDays: number;
  firstMessageDone: boolean;

  // Accessibility & privacy
  textScale: number; // 0.9 .. 1.35
  dyslexiaFont: boolean;
  privateMode: boolean;
  /** Slow or disable mascot / decorative animations for a calmer experience. */
  reduceMotion: boolean;
  /** Speech synthesis rate (0.7 slow … 1.2 fast) */
  voiceRate: number;
  /** Focus / Business mode: terse, structured, no mascot, Ultra model default. */
  focusMode: boolean;
  /** Web search + citations. Only applied when focusMode is on. */
  webSearch: boolean;
  /** Per-bot language override. Falls back to `language` when unset. */
  botLanguages: Record<string, LangCode>;
};

/** Persona presets applied in one tap during onboarding. */
export const PERSONA_PRESETS: Record<Persona, { warmth: number; textScale: number; voiceRate: number }> = {
  kid:   { warmth: 85, textScale: 1.15, voiceRate: 0.95 },
  teen:  { warmth: 75, textScale: 1.00, voiceRate: 1.10 },
  adult: { warmth: 60, textScale: 1.00, voiceRate: 1.00 },
  elder: { warmth: 70, textScale: 1.25, voiceRate: 0.85 },
};

export type ModelId = "askeasy/smart" | "askeasy/eco" | "askeasy/ultra";

export type ModelInfo = {
  id: ModelId;
  label: string;
  hint: string;
  tier: "free" | "pro";
};

export const MODELS: ModelInfo[] = [
  { id: "askeasy/smart", label: "Smart", hint: "Balanced everyday answers", tier: "free" },
  { id: "askeasy/eco",   label: "Eco",   hint: "Fast & lightweight",       tier: "free" },
  { id: "askeasy/ultra", label: "Ultra", hint: "Deep reasoning · Pro",     tier: "pro"  },
];

export const PERSONAS: { id: Persona; label: string; emoji: string; hint: string }[] = [
  { id: "kid",   label: "Kid",     emoji: "🎈", hint: "Simple words, playful, safe" },
  { id: "teen",  label: "Teen",    emoji: "🎧", hint: "Casual, upbeat, quick" },
  { id: "adult", label: "Grown-up",emoji: "☕", hint: "Balanced, clear, direct" },
  { id: "elder", label: "Elder",   emoji: "🌿", hint: "Large text, slow, patient" },
];

export const FREE_LIMITS = { text: 5, media: 2, voice: 2 } as const;
export const TRIAL_DAYS = 3;
export const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

export type Usage = { text: number; media: number; voice: number };

export function modelTier(id: string): "free" | "pro" {
  return MODELS.find((m) => m.id === id)?.tier ?? "free";
}

export const SETTINGS_KEY = "askeasy.settings.v6";
export const MESSAGES_KEY = "askeasy.messages.v1";
export const USAGE_KEY = "askeasy.usage.v1";

const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "system",
  voiceEnabled: true,
  openRouterModel: "askeasy/smart",
  isPro: false,
  language: "en",
  trialStartedAt: null,
  persona: "adult",
  warmth: 60,
  aboutMe: [],
  mood: null,
  lastActiveDate: null,
  streakDays: 0,
  firstMessageDone: false,
  textScale: 1,
  dyslexiaFont: false,
  privateMode: false,
  reduceMotion: false,
  voiceRate: 1,
  focusMode: false,
  botLanguages: {},
};


const DEFAULT_USAGE: Usage = { text: 0, media: 0, voice: 0 };

/** Days left in the language trial. Returns 0 if trial expired or never started. */
export function trialDaysLeft(settings: Settings): number {
  if (!settings.trialStartedAt) return 0;
  const elapsed = Date.now() - settings.trialStartedAt;
  const left = TRIAL_MS - elapsed;
  return left > 0 ? Math.ceil(left / (24 * 60 * 60 * 1000)) : 0;
}

export function trialActive(settings: Settings): boolean {
  return trialDaysLeft(settings) > 0;
}

/** Can this user reply in the given language right now? */
export function canUseLanguage(settings: Settings, code: LangCode, isPro: boolean): boolean {
  if (code === "en") return true;
  if (isPro) return true;
  return trialActive(settings);
}

function readJSON<T extends object>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(readJSON<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const applyTheme = () => {
      const root = document.documentElement;
      const t = settings.theme;
      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
      const dark = t === "dark" || (t === "system" && prefersDark);
      root.classList.toggle("dark", dark);
    };
    applyTheme();
    if (settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyTheme);
    return () => mq.removeEventListener("change", applyTheme);
  }, [settings.theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.setProperty("--text-scale", String(settings.textScale ?? 1));
    root.classList.toggle("font-dyslexic", !!settings.dyslexiaFont);
    root.classList.toggle("reduce-motion", !!settings.reduceMotion);
  }, [settings.textScale, settings.dyslexiaFont, settings.reduceMotion]);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    []
  );

  return { settings, update, hydrated };
}

/** UI stays English; kept for callers. */
export function useI18n(_settings: Settings) {
  return useCallback(
    (key: string, vars?: Record<string, string>) => translate("en", key, vars),
    [],
  );
}

/** Build a prompt suffix that reflects persona, warmth, and remembered facts. */
export function personalityPrompt(s: Settings): string {
  const bits: string[] = [];
  const nameBit = s.name ? `The user's name is ${s.name}. Greet warmly by name when it fits.` : "";
  if (nameBit) bits.push(nameBit);

  if (s.focusMode) {
    bits.push(
      "FOCUS MODE — this is a serious work session. Be terse, precise, and professional. " +
      "No mascot chatter, no emoji, no filler ('Great question!', 'Sure!'). " +
      "Structure answers with headings, bullet lists, and tables when useful. " +
      "Cite sources or note uncertainty explicitly. Never guess numbers. " +
      "Prefer step-by-step or checklist format for tasks."
    );
  } else {
    const personaMap: Record<Persona, string> = {
      kid:   "Audience: a curious child (~6-11). Use short sentences (max ~12 words), simple words, playful analogies, occasional emoji. Never discuss violence, adult, or unsafe topics; gently redirect to safe alternatives.",
      teen:  "Audience: a teenager. Be upbeat, casual, brief, and encouraging. Light emoji ok. Avoid lectures.",
      adult: "Audience: an adult. Be clear, direct, and helpful. Skip filler.",
      elder: "Audience: an older adult. Use larger conceptual chunks, gentle pacing, plain vocabulary, and step-by-step guidance. Confirm understanding at the end.",
    };
    bits.push(personaMap[s.persona]);

    const warmthLabel =
      s.warmth < 25 ? "very professional and concise"
      : s.warmth < 55 ? "warm-professional, friendly but focused"
      : s.warmth < 80 ? "friendly, encouraging, with light personality"
      : "playful and enthusiastic with tasteful humor";
    bits.push(`Tone: ${warmthLabel}.`);
  }

  if (s.aboutMe.length) {
    bits.push(
      `About the user (their own words, keep private): ${s.aboutMe.slice(0, 5).map((x) => `"${x}"`).join(", ")}. ` +
      `Reference these naturally when relevant — an example, an analogy, a tailored suggestion, a follow-up question. ` +
      `Never list them back verbatim, never announce "based on your preferences", and don't force a reference into every reply.`
    );
  }

  if (!s.focusMode) {
    if (s.mood === "down") {
      bits.push("The user mentioned feeling down today. Lead with brief empathy before answering.");
    } else if (s.mood === "great") {
      bits.push("The user is in a great mood — match their energy.");
    }
  }

  bits.push("Always end your reply with 2-3 short follow-up suggestions as a bullet list starting with the token `[FOLLOW-UPS]` on its own line, each under 6 words.");
  return bits.join("\n");
}

/** Update the streak based on today's date. Returns { newStreak, changed }. */
export function tickStreak(s: Settings): { streakDays: number; lastActiveDate: string; changed: boolean } {
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastActiveDate === today) return { streakDays: s.streakDays, lastActiveDate: today, changed: false };
  const y = new Date(); y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  const streakDays = s.lastActiveDate === yesterday ? s.streakDays + 1 : 1;
  return { streakDays, lastActiveDate: today, changed: true };
}

/** Extract follow-up suggestions the model appended after `[FOLLOW-UPS]`. */
export function splitFollowUps(reply: string): { body: string; followUps: string[] } {
  const idx = reply.indexOf("[FOLLOW-UPS]");
  if (idx < 0) return { body: reply.trim(), followUps: [] };
  const body = reply.slice(0, idx).trim();
  const tail = reply.slice(idx + "[FOLLOW-UPS]".length);
  const followUps = tail
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s\-*•\d.]+/, "").trim())
    .filter((l) => l.length > 0 && l.length < 60)
    .slice(0, 3);
  return { body, followUps };
}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MESSAGES_KEY);
      if (raw) setMessages(JSON.parse(raw) as Message[]);
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);


  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  const addMessage = useCallback((m: Omit<Message, "id" | "createdAt">) => {
    const msg: Message = { ...m, id: crypto.randomUUID(), createdAt: Date.now() };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const updateMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, addMessage, updateMessage, clear, hydrated };
}

export function useUsage() {
  const [usage, setUsage] = useState<Usage>(DEFAULT_USAGE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(USAGE_KEY);
      if (raw) setUsage({ ...DEFAULT_USAGE, ...JSON.parse(raw) });
    } catch {
      /* noop */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
  }, [usage, hydrated]);

  const bump = useCallback(
    (kind: keyof Usage, n = 1) => setUsage((u) => ({ ...u, [kind]: u[kind] + n })),
    []
  );
  const resetUsage = useCallback(() => setUsage(DEFAULT_USAGE), []);

  return { usage, bump, resetUsage, hydrated };
}

export function quotaCheck(
  usage: Usage,
  text: string,
  attachments: Attachment[]
): { needs: Array<keyof Usage>; overLimit: Array<keyof Usage>; remaining: Usage } {
  const needs: Array<keyof Usage> = [];
  if (text.trim().length > 0) needs.push("text");
  const mediaCount = attachments.filter((a) => a.type === "image" || a.type === "file").length;
  const voiceCount = attachments.filter((a) => a.type === "audio").length;
  if (mediaCount > 0) needs.push("media");
  if (voiceCount > 0) needs.push("voice");

  const remaining: Usage = {
    text: Math.max(0, FREE_LIMITS.text - usage.text),
    media: Math.max(0, FREE_LIMITS.media - usage.media),
    voice: Math.max(0, FREE_LIMITS.voice - usage.voice),
  };
  const overLimit = needs.filter((k) => {
    const cost = k === "text" ? 1 : k === "media" ? mediaCount : voiceCount;
    return remaining[k] < cost;
  });
  return { needs, overLimit, remaining };
}

export async function sendToAI(args: {
  messages: Message[];
  settings: Settings;
  signal?: AbortSignal;
  system?: string;
}): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    const tok = data.session?.access_token;
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  } catch {
    /* anon fine */
  }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    signal: args.signal,
    body: JSON.stringify({
      model: args.settings.openRouterModel,
      language: args.settings.language,
      system: args.system,
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Chat failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { reply?: string };
  return data.reply ?? "";
}


// -------- Auth session --------
export type AuthUser = { id: string; email?: string; name?: string; avatar?: string } | null;

export function useAuthUser(): AuthUser {
  const [user, setUser] = useState<AuthUser>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u)
        setUser({
          id: u.id,
          email: u.email ?? undefined,
          name: (u.user_metadata as { full_name?: string } | undefined)?.full_name,
          avatar: (u.user_metadata as { avatar_url?: string } | undefined)?.avatar_url,
        });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(
        u
          ? {
              id: u.id,
              email: u.email ?? undefined,
              name: (u.user_metadata as { full_name?: string } | undefined)?.full_name,
              avatar: (u.user_metadata as { avatar_url?: string } | undefined)?.avatar_url,
            }
          : null,
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}
