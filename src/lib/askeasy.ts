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

export type Settings = {
  name: string;
  theme: Theme;
  voiceEnabled: boolean;
  openRouterModel: string;
  isPro: boolean;
  indiaMode: boolean;
  language: LangCode;
  indiaOnboarded: boolean;
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

export const FREE_LIMITS = { text: 5, media: 2, voice: 2 } as const;

export type Usage = { text: number; media: number; voice: number };

export function modelTier(id: string): "free" | "pro" {
  return MODELS.find((m) => m.id === id)?.tier ?? "free";
}

const SETTINGS_KEY = "askeasy.settings.v4";
const MESSAGES_KEY = "askeasy.messages.v1";
const USAGE_KEY = "askeasy.usage.v1";
const INDIA_DEFAULT_LANGUAGE: LangCode = "hi";

const DEFAULT_SETTINGS: Settings = {
  name: "",
  theme: "system",
  voiceEnabled: true,
  openRouterModel: "askeasy/smart",
  isPro: false,
  indiaMode: false,
  language: "en",
  indiaOnboarded: false,
};

const DEFAULT_USAGE: Usage = { text: 0, media: 0, voice: 0 };

function normalizeSettings(settings: Settings): Settings {
  if (!settings.indiaMode) {
    return { ...settings, language: "en" };
  }
  return {
    ...settings,
    language: settings.language === "en" ? INDIA_DEFAULT_LANGUAGE : settings.language,
  };
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as object) } as T : fallback;
  } catch {
    return fallback;
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(normalizeSettings(readJSON<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS)));
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
      // India Mode overrides light/dark with the tricolor theme.
      if (settings.indiaMode) {
        root.classList.remove("dark");
        root.classList.add("india");
        return;
      }
      root.classList.remove("india");
      const t = settings.theme;
      const prefersDark =
        window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
      const dark = t === "dark" || (t === "system" && prefersDark);
      root.classList.toggle("dark", dark);
    };
    applyTheme();
    if (settings.indiaMode || settings.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applyTheme);
    return () => mq.removeEventListener("change", applyTheme);
  }, [settings.theme, settings.indiaMode]);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => normalizeSettings({ ...s, ...patch })),
    []
  );

  return { settings, update, hydrated };
}

/** Localized string helper bound to current settings. */
export function useI18n(settings: Settings) {
  const lang: LangCode = settings.indiaMode ? settings.language : "en";
  return useCallback(
    (key: string, vars?: Record<string, string>) => translate(lang, key, vars),
    [lang],
  );
}

export function useConversation() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(MESSAGES_KEY);
      if (raw) setMessages(JSON.parse(raw) as Message[]);
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages, hydrated]);

  const addMessage = useCallback((m: Omit<Message, "id" | "createdAt">) => {
    const msg: Message = {
      ...m,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
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
    } catch {}
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
): {
  needs: Array<keyof Usage>;
  overLimit: Array<keyof Usage>;
  remaining: Usage;
} {
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
}): Promise<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  try {
    const { data } = await supabase.auth.getSession();
    const tok = data.session?.access_token;
    if (tok) headers["Authorization"] = `Bearer ${tok}`;
  } catch { /* anonymous — fine */ }

  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    signal: args.signal,
    body: JSON.stringify({
      model: args.settings.openRouterModel,
      language: args.settings.indiaMode ? args.settings.language : undefined,
      messages: args.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Chat failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as { reply?: string };
  return data.reply ?? "";
}

// -------- Auth session + cloud sync --------
export type AuthUser = { id: string; email?: string; name?: string; avatar?: string } | null;

export function useAuthUser(): AuthUser {
  const [user, setUser] = useState<AuthUser>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setUser({ id: u.id, email: u.email ?? undefined, name: (u.user_metadata as { full_name?: string } | undefined)?.full_name, avatar: (u.user_metadata as { avatar_url?: string } | undefined)?.avatar_url });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? undefined, name: (u.user_metadata as { full_name?: string } | undefined)?.full_name, avatar: (u.user_metadata as { avatar_url?: string } | undefined)?.avatar_url } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return user;
}
