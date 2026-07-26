import { useCallback, useEffect, useState } from "react";
import type { Message } from "./askeasy";

export type Thread = {
  id: string;
  botId: string;
  title: string;
  updatedAt: number;
  createdAt: number;
};

export type ThreadMessage = Message & { followUps?: string[] };

const THREADS_KEY = "askeasy.threads.v1";
const messagesKey = (botId: string, threadId: string) =>
  `askeasy.thread.${botId}.${threadId}.msgs.v1`;

function readThreads(): Thread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(THREADS_KEY);
    return raw ? (JSON.parse(raw) as Thread[]) : [];
  } catch {
    return [];
  }
}

function writeThreads(all: Thread[]) {
  try {
    window.localStorage.setItem(THREADS_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export function createThread(botId: string, title = "New chat"): Thread {
  const now = Date.now();
  const t: Thread = {
    id: (globalThis.crypto?.randomUUID?.() ?? `t_${now}_${Math.random().toString(36).slice(2, 8)}`),
    botId,
    title,
    createdAt: now,
    updatedAt: now,
  };
  const all = readThreads();
  writeThreads([t, ...all]);
  return t;
}

export function deleteThread(id: string) {
  const all = readThreads();
  const target = all.find((t) => t.id === id);
  writeThreads(all.filter((t) => t.id !== id));
  if (target) {
    try { window.localStorage.removeItem(messagesKey(target.botId, id)); } catch { /* noop */ }
  }
}

export function renameThread(id: string, title: string) {
  const all = readThreads();
  writeThreads(all.map((t) => (t.id === id ? { ...t, title, updatedAt: Date.now() } : t)));
}

export function touchThread(id: string, patch: Partial<Pick<Thread, "title">> = {}) {
  const all = readThreads();
  writeThreads(all.map((t) => (t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t)));
}

export function loadThreadMessages(botId: string, threadId: string): ThreadMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(messagesKey(botId, threadId));
    return raw ? (JSON.parse(raw) as ThreadMessage[]) : [];
  } catch {
    return [];
  }
}

export function saveThreadMessages(botId: string, threadId: string, msgs: ThreadMessage[]) {
  try {
    window.localStorage.setItem(messagesKey(botId, threadId), JSON.stringify(msgs));
  } catch { /* noop */ }
}

/** Idempotent: returns threads for a bot, creating a first thread if none exist. */
export function ensureThreadForBot(botId: string): { threads: Thread[]; active: Thread } {
  let all = readThreads();
  let mine = all.filter((t) => t.botId === botId).sort((a, b) => b.updatedAt - a.updatedAt);
  if (mine.length === 0) {
    const t = createThread(botId);
    mine = [t];
    all = readThreads();
  }
  return { threads: all.filter((t) => t.botId === botId).sort((a, b) => b.updatedAt - a.updatedAt), active: mine[0] };
}

export function useThreads(botId: string | undefined) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const refresh = useCallback(() => {
    if (!botId) return;
    const all = readThreads();
    setThreads(all.filter((t) => t.botId === botId).sort((a, b) => b.updatedAt - a.updatedAt));
  }, [botId]);

  useEffect(() => {
    if (!botId || typeof window === "undefined") return;
    refresh();
    setHydrated(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === THREADS_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [botId, refresh]);

  return { threads, hydrated, refresh };
}
