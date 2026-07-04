import { useCallback, useEffect, useState } from "react";

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

export type Settings = {
  name: string;
  darkMode: boolean;
  smartMode: boolean;
  voiceEnabled: boolean;
  openRouterModel: string;
};

const SETTINGS_KEY = "askeasy.settings.v1";
const MESSAGES_KEY = "askeasy.messages.v1";

const DEFAULT_SETTINGS: Settings = {
  name: "",
  darkMode: false,
  smartMode: true,
  voiceEnabled: true,
  openRouterModel: "askeasy/smart",
};

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
    setSettings(readJSON<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, hydrated]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", settings.darkMode);
  }, [settings.darkMode]);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    []
  );

  return { settings, update, hydrated };
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

/**
 * Placeholder for AI wiring. Replace this with a call to your backend / OpenRouter.
 * The UI already handles user input, attachments, streaming state, and error display.
 */
export async function sendToAI(_args: {
  messages: Message[];
  settings: Settings;
  signal?: AbortSignal;
}): Promise<string> {
  // Simulate typing so the UI feels alive until AI is wired.
  await new Promise((r) => setTimeout(r, 900));
  return "AskEasy isn't wired to a model yet. Add your OpenRouter API key in Settings and connect `sendToAI` in `src/lib/askeasy.ts` to your backend.";
}
