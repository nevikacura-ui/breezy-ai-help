import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Settings as SettingsIcon, RotateCcw, ThumbsUp, ThumbsDown, Send, Square, Mic, EyeOff, Trash2, Smile } from "lucide-react";
import { getBotById, useCustomBots, useOnboarding, ONBOARDING_CATEGORIES, type Bot } from "@/lib/bots";
import { BotAvatar } from "@/components/askeasy/BotAvatar";
import {
  sendToAI, useAuthUser, useSettings, useUsage,
  personalityPrompt, tickStreak, splitFollowUps,
  type Message, type Mood,
} from "@/lib/askeasy";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { LANG_ENGLISH_NAME, isRTL, t } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$botId")({
  head: ({ params }) => ({
    meta: [
      { title: `Chat — ${params.botId}` },
      { name: "description", content: "Personalized AI conversation." },
    ],
  }),
  component: BotChat,
});

type EnrichedMessage = Message & { followUps?: string[] };

function chatKey(botId: string) { return `askeasy.chat.${botId}.v2`; }

const MOOD_OPTIONS: { id: NonNullable<Mood>; emoji: string; label: string }[] = [
  { id: "great", emoji: "🤩", label: "Great" },
  { id: "good",  emoji: "😊", label: "Good"  },
  { id: "meh",   emoji: "😐", label: "Meh"   },
  { id: "down",  emoji: "🥺", label: "Down"  },
];

function BotChat() {
  const { botId } = Route.useParams();
  const nav = useNavigate();
  const { bots: customBots } = useCustomBots();
  const bot = getBotById(botId, customBots);
  const { settings, update } = useSettings();
  const { usage } = useUsage();
  const user = useAuthUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { state: onboarding } = useOnboarding();

  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [askMood, setAskMood] = useState(false);
  const [focused, setFocused] = useState(false);
  const [napping, setNapping] = useState(false);
  const [reaction, setReaction] = useState<null | "excited" | "curious" | "comfort">(null);
  const [reactionKey, setReactionKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Idle → nap after inactivity (resets on any activity below)
  const bumpActivity = useCallback(() => {
    if (napping) setNapping(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setNapping(true), 22000);
  }, [napping]);
  useEffect(() => { bumpActivity(); return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); }; }, [bumpActivity]);

  // Detect tone of the most recent user message → trigger a one-shot reaction
  const detectTone = (text: string): "excited" | "curious" | "comfort" | null => {
    const t = text.trim();
    if (!t) return null;
    if (/(sad|tired|lonely|upset|hurt|anxious|worried|stressed|cry|😢|😭|🥺|💔)/i.test(t)) return "comfort";
    if (/[!]{1,}|amazing|awesome|yay|wow|love it|🎉|🥳|😄|😁/i.test(t)) return "excited";
    if (/\?\s*$|why|how|what|when|where|who|which/i.test(t)) return "curious";
    return null;
  };
  const triggerReaction = useCallback((tone: ReturnType<typeof detectTone>) => {
    if (!tone) return;
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setReaction(tone);
    setReactionKey((k) => k + 1);
    const dur = tone === "comfort" ? 2800 : 1400;
    reactionTimerRef.current = setTimeout(() => setReaction(null), dur);
  }, []);

  const categoryLabels = useMemo(
    () =>
      onboarding.categories
        .map((id) => ONBOARDING_CATEGORIES.find((c) => c.id === id)?.label)
        .filter((x): x is string => !!x),
    [onboarding.categories],
  );

  const effectiveLang = (bot && settings.botLanguages?.[bot.id]) || settings.language;
  const langName = LANG_ENGLISH_NAME[effectiveLang] ?? "English";

  const systemPrompt = useMemo(() => {
    if (!bot) return "";
    const bits: string[] = [bot.systemPrompt, personalityPrompt(settings)];
    if (categoryLabels.length) {
      bits.push(`The user is especially interested in: ${categoryLabels.join(", ")}. Weave in when relevant.`);
    }
    bits.push(`Reply in ${langName} unless the user explicitly asks otherwise.`);
    return bits.join("\n\n");
  }, [bot, settings, categoryLabels, langName]);

  // Streak + weekly mood check-in on mount
  useEffect(() => {
    if (!hydrated) return;
    const { streakDays, lastActiveDate, changed } = tickStreak(settings);
    if (changed) {
      update({ streakDays, lastActiveDate });
      if (streakDays > 1) toast(`🔥 ${streakDays}-day streak!`, { description: "Nice, you're building a habit." });
    }
    // Weekly mood ask
    const last = Number(window.localStorage.getItem("askeasy.moodAskedAt") || 0);
    if (Date.now() - last > 7 * 24 * 60 * 60 * 1000) {
      setAskMood(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Hydrate per-bot history + prefill first message
  useEffect(() => {
    if (!bot) return;
    try {
      const raw = settings.privateMode ? null : window.localStorage.getItem(chatKey(bot.id));
      if (raw) {
        setMessages(JSON.parse(raw) as EnrichedMessage[]);
      } else {
        const nameBit = settings.name ? `, ${settings.name}` : "";
        const greeting = bot.greeting.replace(/^Hi[!,]?/i, `Hi${nameBit}!`).replace(/^Hello[!,]?/i, `Hello${nameBit}!`);
        setMessages([{ id: "g", role: "assistant", content: greeting, createdAt: Date.now() }]);
        const opener =
          categoryLabels.length > 0
            ? `Hey ${bot.name}! I'm into ${categoryLabels.slice(0, 3).join(", ")} — where should we start?`
            : `Hey ${bot.name}, what can you help me with?`;
        setInput(opener);
      }
    } catch {
      setMessages([{ id: "g", role: "assistant", content: bot.greeting, createdAt: Date.now() }]);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot?.id]);

  useEffect(() => {
    if (!bot || !hydrated) return;
    if (settings.privateMode) return;
    window.localStorage.setItem(chatKey(bot.id), JSON.stringify(messages));
  }, [messages, hydrated, bot?.id, settings.privateMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const sendText = useCallback(async (text: string) => {
    if (!bot || !text.trim() || thinking) return;
    const userMsg: EnrichedMessage = { id: crypto.randomUUID(), role: "user", content: text.trim(), createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    bumpActivity();
    triggerReaction(detectTone(userMsg.content));
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await sendToAI({
        messages: [...messages, userMsg],
        settings,
        system: systemPrompt,
        signal: controller.signal,
      });
      const { body, followUps } = splitFollowUps(reply);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: body, followUps, createdAt: Date.now() }]);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate([18, 40, 18]); } catch { /* noop */ }
      }
      // First-message celebration
      if (!settings.firstMessageDone) {
        update({ firstMessageDone: true });
        setConfetti(true);
        setTimeout(() => setConfetti(false), 1800);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("Something went wrong. Try again.");
    } finally {
      setThinking(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [bot, thinking, messages, settings, systemPrompt, update]);

  const send = useCallback(() => sendText(input), [input, sendText]);
  const stop = () => abortRef.current?.abort();

  const regenerate = async () => {
    if (!bot) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") return prev.slice(0, -1);
      return prev;
    });
    setThinking(true);
    try {
      const reply = await sendToAI({ messages: messages.filter((_, i) => i < messages.length - 1), settings, system: systemPrompt });
      const { body, followUps } = splitFollowUps(reply);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: body, followUps, createdAt: Date.now() }]);
    } catch {
      toast.error("Couldn't regenerate.");
    } finally {
      setThinking(false);
    }
  };

  // Voice input — MediaRecorder + Gateway transcription (persona-aware).
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const cancelRef = useRef<boolean>(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  // Persona-tuned min duration: elders/kids get more grace before a release counts as cancel.
  const MIN_MS: Record<string, number> = { kid: 500, teen: 300, adult: 350, elder: 700 };
  const minHold = MIN_MS[settings.persona] ?? 350;

  const cleanupStream = () => {
    try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* noop */ }
    streamRef.current = null;
    recorderRef.current = null;
    chunksRef.current = [];
  };

  const startListening = async () => {
    if (listening || transcribing) return;
    if (!settings.voiceEnabled) return toast.message("Voice input is off", { description: "Enable it in Settings." });
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      return toast.message("Voice not supported here");
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      // Prefer webm/opus; Safari falls back to mp4.
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (t) => (window as any).MediaRecorder?.isTypeSupported?.(t)
      ) || "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recorderRef.current = rec;
      chunksRef.current = [];
      cancelRef.current = false;
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanupStream();
        setListening(false);
        if (cancelRef.current) return;
        if (blob.size < 1200) {
          toast.message("Didn't catch that — try holding a bit longer.");
          return;
        }
        setTranscribing(true);
        try {
          const fd = new FormData();
          fd.append("file", blob, `hold.${type.includes("mp4") ? "mp4" : "webm"}`);
          fd.append("persona", settings.persona);
          if (/^[a-z]{2}$/.test(effectiveLang)) fd.append("language", effectiveLang);
          const res = await fetch("/api/transcribe", { method: "POST", body: fd });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || `Transcription failed (${res.status})`);
          const text = (data?.text || "").trim();
          if (!text) { toast.message("Couldn't hear you clearly."); return; }
          setInput(text);
          // Auto-send so hold-to-talk is truly hands-free.
          setTimeout(() => sendMessage(text), 40);
        } catch (err: any) {
          toast.error(err?.message ?? "Voice transcription failed");
        } finally {
          setTranscribing(false);
        }
      };
      // Capture in small slices so we get audio even if the tab loses focus.
      rec.start(250);
      startedAtRef.current = Date.now();
      setListening(true);
      try { navigator.vibrate?.(12); } catch { /* noop */ }
    } catch {
      toast.error("Mic permission denied");
      cleanupStream();
    }
  };

  const stopListening = (opts: { cancel?: boolean } = {}) => {
    if (!listening || !recorderRef.current) return;
    const held = Date.now() - startedAtRef.current;
    // Too short to be intentional → treat as cancel.
    const cancel = opts.cancel || held < minHold;
    cancelRef.current = cancel;
    try { recorderRef.current.stop(); } catch { /* noop */ }
    if (cancel) {
      try { navigator.vibrate?.([6, 40, 6]); } catch { /* noop */ }
    } else {
      try { navigator.vibrate?.(8); } catch { /* noop */ }
    }
  };

  // Escape cancels an active recording.
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") stopListening({ cancel: true }); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listening]);

  // sendMessage is defined below (uses the value directly, bypassing the input state race).
  const sendMessage = (text: string) => {
    const value = text.trim();
    if (!value) return;
    setInput(value);
    // Defer to next tick so state settles, then reuse the existing send path.
    setTimeout(() => send(), 0);
  };

  const forgetMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    toast.success("Forgotten.");
  };

  const answerMood = (m: Mood) => {
    update({ mood: m });
    window.localStorage.setItem("askeasy.moodAskedAt", String(Date.now()));
    setAskMood(false);
  };

  if (!bot) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ background: "var(--ink)", color: "var(--cream)" }}>
        Bot not found. <Link to="/bots" className="ml-2 underline">Home</Link>
      </div>
    );
  }

  const mascotClass = listening
    ? "mascot-listen"
    : thinking
      ? "mascot-curious"
      : reaction === "excited"
        ? "mascot-excited"
        : reaction === "curious"
          ? "mascot-curious"
          : reaction === "comfort"
            ? "mascot-comfort"
            : (focused || input.length > 0)
              ? "mascot-tilt"
              : napping
                ? "mascot-nap"
                : "mascot-idle";
  const Mascot = ({ size = 32 }: { size?: number }) => (
    <span key={`${reactionKey}-${mascotClass}`} className={`mascot-wrap ${mascotClass} ${napping ? "napping" : ""}`}>
      <BotAvatar bot={bot} size={size} eager emojiSize={Math.round(size * 0.47)} />
      <span className="mascot-eyelid" aria-hidden />
      {napping && <span className="mascot-zzz" aria-hidden>z</span>}
    </span>
  );
  const suggestedQuickChips = buildFallbackChips({
    persona: settings.persona,
    warmth: settings.warmth,
    categories: categoryLabels,
    langName,
    currentLangCode: settings.language,
  });


  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5">
        <button
          onClick={() => nav({ to: "/bots" })}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold"
          style={{ background: "color-mix(in oklab, var(--cream) 10%, transparent)", color: "var(--cream)" }}
          aria-label="Back to bots"
        >
          <ArrowLeft className="h-4 w-4" />
          Bots
        </button>
        <div className="flex items-center gap-2">
          {!settings.focusMode && <Mascot size={32} />}
          <div className="font-display text-[1rem]">{bot.name}</div>
          {settings.focusMode && (
            <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ background: "color-mix(in oklab, var(--cream) 14%, transparent)" }}>Focus</span>
          )}
          {settings.privateMode && <EyeOff className="h-3.5 w-3.5 opacity-60" aria-label="Private" />}
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 10%, transparent)" }}
          aria-label="Settings"
        >
          <SettingsIcon className="h-5 w-5" />
        </button>
      </header>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        update={update}
        isProEffective={!!user}
        usage={usage}
        onUpgrade={() => setSettingsOpen(false)}
        onClearConversation={() => {
          try { window.localStorage.removeItem(chatKey(bot.id)); } catch { /* noop */ }
          setMessages([{ id: "g", role: "assistant", content: bot.greeting, createdAt: Date.now() }]);
          setSettingsOpen(false);
        }}
        onSelectLanguage={(code) => update({ language: code })}
      />

      {/* Mood check-in */}
      {askMood && (
        <div className="mx-4 mt-3 rounded-2xl border p-3 animate-fade-up"
          style={{ borderColor: "color-mix(in oklab, var(--cream) 14%, transparent)", background: "color-mix(in oklab, var(--cream) 6%, transparent)" }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Smile className="h-4 w-4" /> How are you feeling today?
          </div>
          <div className="mt-2 flex gap-2">
            {MOOD_OPTIONS.map((m) => (
              <button key={m.id} onClick={() => answerMood(m.id)} className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px]"
                style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}>
                <span className="text-xl leading-none">{m.emoji}</span>{m.label}
              </button>
            ))}
          </div>
          <button onClick={() => answerMood(null)} className="mt-2 w-full text-center text-[11px] opacity-60">Skip</button>
        </div>
      )}

      {/* Messages */}
      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-40 pt-5">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {messages.map((m, idx) => (
            <MessageRow
              key={m.id}
              m={m}
              bot={bot}
              isLast={idx === messages.length - 1}
              onForget={() => forgetMessage(m.id)}
              onQuickAsk={sendText}
              quickChips={idx === messages.length - 1 && m.role === "assistant" ? (m.followUps?.length ? m.followUps : suggestedQuickChips) : []}
            />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 opacity-70">
              {!settings.focusMode && <Mascot size={32} />}
              <div className="flex items-center gap-1 rounded-2xl px-3 py-2"
                style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.15s" }} />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Regenerate pill */}
      {!thinking && messages.length > 1 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-20 flex justify-center px-4">
          <button
            onClick={regenerate}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold"
            style={{ background: "var(--lavender)", color: "var(--ink)" }}
          >
            <RotateCcw className="h-3 w-3" />
            Regenerate
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-5 pt-3"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        <div className="mx-auto flex max-w-lg items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--cream) 12%, transparent)" }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); bumpActivity(); }}
            onKeyDown={(e) => { bumpActivity(); if (e.key === "Enter") send(); }}
            onFocus={() => { setFocused(true); bumpActivity(); }}
            onBlur={() => setFocused(false)}
            placeholder={transcribing ? "…" : listening ? "…" : t(settings.language, "compose.placeholder")}
            className="flex-1 bg-transparent py-2.5 text-[14.5px] outline-none placeholder:opacity-40"
            style={{ color: "var(--cream)" }}
            dir={isRTL(settings.language) ? "rtl" : "ltr"}
          />
          {/* Hold-to-talk mic */}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); startListening(); }}
            onPointerUp={() => stopListening()}
            onPointerCancel={() => stopListening({ cancel: true })}
            onPointerLeave={() => { if (listening) stopListening({ cancel: true }); }}
            onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); startListening(); } }}
            onKeyUp={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); stopListening(); } }}
            aria-label={listening ? "Recording — release to send, drag away to cancel" : "Hold to talk"}
            aria-pressed={listening}
            disabled={transcribing}
            className="flex h-11 w-11 items-center justify-center rounded-full transition-transform touch-none select-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              background: listening ? "var(--butter)" : transcribing ? "color-mix(in oklab, var(--lavender) 40%, transparent)" : "color-mix(in oklab, var(--cream) 12%, transparent)",
              color: listening || transcribing ? "var(--ink)" : "var(--cream)",
              transform: listening ? "scale(1.08)" : "scale(1)",
              boxShadow: listening ? "0 0 0 6px color-mix(in oklab, var(--butter) 25%, transparent)" : "none",
            }}
          >
            <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
          </button>
          {/* Live status region for screen readers */}
          <span className="sr-only" aria-live="polite">
            {listening ? "Recording" : transcribing ? "Transcribing your voice" : ""}
          </span>

          {thinking ? (
            <button
              onClick={stop}
              aria-label="Stop"
              className="flex h-11 w-11 items-center justify-center rounded-full"
              style={{ background: "var(--lavender)", color: "var(--ink)" }}
            >
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={send}
              disabled={!input.trim()}
              aria-label="Send"
              className="flex h-11 w-11 items-center justify-center rounded-full transition-all disabled:opacity-40"
              style={{ background: "var(--butter)", color: "var(--ink)" }}
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confetti */}
      {confetti && (
        <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => {
            const colors = ["var(--butter)", "var(--lavender)", "var(--pink)", "var(--mint)", "var(--peach)"];
            const left = Math.random() * 100;
            const dx = (Math.random() - 0.5) * 240;
            const delay = Math.random() * 0.4;
            const bg = colors[i % colors.length];
            return (
              <span
                key={i}
                className="animate-confetti absolute top-0 h-2 w-2 rounded-sm"
                style={{ left: `${left}%`, background: bg, animationDelay: `${delay}s`, ["--dx" as any]: `${dx}px` }}
              />
            );
          })}
        </div>
      )}
    </main>
  );
}

// Alt language rotation for the "try in another language" chip
const ALT_LANGS: { code: string; name: string }[] = [
  { code: "es", name: "Spanish"  },
  { code: "fr", name: "French"   },
  { code: "hi", name: "Hindi"    },
  { code: "ja", name: "Japanese" },
  { code: "de", name: "German"   },
  { code: "pt", name: "Portuguese" },
];

function buildFallbackChips(opts: {
  persona: "kid" | "teen" | "adult" | "elder";
  warmth: number;
  categories: string[];
  langName: string;
  currentLangCode: string;
}): string[] {
  const { persona, warmth, categories, currentLangCode } = opts;
  const playful = warmth >= 70;

  // 1) Depth/clarity chip — tuned to persona
  const clarity =
    persona === "kid"   ? "Explain like I'm 6"
    : persona === "teen"  ? "TL;DR please"
    : persona === "elder" ? "Explain slowly, step by step"
    : "Explain simpler";

  // 2) Concrete-example chip — tuned to first category if we have one
  const topic = categories[0];
  const example = topic
    ? (playful ? `Fun ${topic.toLowerCase()} example?` : `Give a ${topic.toLowerCase()} example`)
    : (playful ? "Give a fun example" : "Give an example");

  // 3) Language variety chip — rotate to a different language than current
  const alt = ALT_LANGS.find((l) => l.code !== currentLangCode) ?? ALT_LANGS[0];
  const language = `Try in ${alt.name}`;

  return [clarity, example, language];
}



function MessageRow({ m, bot, isLast, onForget, onQuickAsk, quickChips }: {
  m: EnrichedMessage; bot: Bot; isLast: boolean; onForget: () => void; onQuickAsk: (t: string) => void; quickChips: string[];
}) {
  const isUser = m.role === "user";
  const [showForget, setShowForget] = useState(false);
  if (isUser) {
    return (
      <div className="group flex items-start justify-end gap-2" onDoubleClick={() => setShowForget((v) => !v)}>
        {showForget && (
          <button onClick={onForget} aria-label="Forget this" className="mt-2 rounded-full p-1 opacity-70 hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <div
          className="max-w-[85%] rounded-2xl rounded-tr-md px-3.5 py-2.5 text-[14px]"
          style={{ background: "color-mix(in oklab, var(--cream) 6%, transparent)", color: "var(--cream)" }}
        >
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <BotAvatar bot={bot} size={32} eager emojiSize={15} />
      <div className="max-w-[85%] flex-1">
        <div
          className="rounded-2xl rounded-tl-md px-3.5 py-3 text-[14px] leading-relaxed"
          style={{
            background: "linear-gradient(180deg, #fff, #fff5f8)",
            color: "var(--ink)",
          }}
        >
          {m.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-1.5" : ""}>{line}</p>
          ))}
        </div>
        {/* Suggested follow-up chips */}
        {isLast && quickChips.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickChips.map((c, i) => (
              <button
                key={i}
                onClick={() => onQuickAsk(c)}
                className="rounded-full border px-2.5 py-1 text-[11.5px] font-medium"
                style={{ borderColor: "color-mix(in oklab, var(--cream) 20%, transparent)", background: "color-mix(in oklab, var(--cream) 6%, transparent)", color: "var(--cream)" }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2 pl-1 opacity-60">
          <button aria-label="Like" className="hover:opacity-100"><ThumbsUp className="h-3.5 w-3.5" /></button>
          <button aria-label="Dislike" className="hover:opacity-100"><ThumbsDown className="h-3.5 w-3.5" /></button>
          <button aria-label="Forget this" onClick={onForget} className="ml-auto hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
