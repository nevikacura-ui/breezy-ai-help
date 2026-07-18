import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Settings as SettingsIcon, RotateCcw, ThumbsUp, ThumbsDown, Send, Square, Mic, EyeOff, Trash2, Smile, Paperclip, FileText, X, Loader2 } from "lucide-react";
import { getBotById, useCustomBots, useOnboarding, ONBOARDING_CATEGORIES, type Bot } from "@/lib/bots";
import { BotAvatar } from "@/components/askeasy/BotAvatar";
import {
  sendToAI, useAuthUser, useSettings, useUsage,
  personalityPrompt, tickStreak, splitFollowUps,
  type Message, type Mood,
} from "@/lib/askeasy";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { LANG_ENGLISH_NAME, LANGUAGES, isRTL, t, detectLanguage, type LangCode } from "@/lib/i18n";
import { extractPdfText, buildDocContext, type PdfDoc } from "@/lib/pdf";
import { toast } from "sonner";
import { StreamText } from "@/components/askeasy/StreamText";


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
  const [detectedLang, setDetectedLang] = useState<LangCode | null>(null);
  const [dismissedLangs, setDismissedLangs] = useState<Set<LangCode>>(new Set());
  const [docs, setDocs] = useState<PdfDoc[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    const docCtx = buildDocContext(docs);
    if (docCtx) bits.push(docCtx);
    return bits.join("\n\n");
  }, [bot, settings, categoryLabels, langName, docs]);


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

  // Smart auto-scroll: stick to bottom while the user is near it; step aside
  // the moment they scroll up. Follows streaming token growth via ResizeObserver
  // without ever fighting the user.
  const stickToBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const NEAR_PX = 80;
    const onScroll = () => {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const goingUp = el.scrollTop < lastScrollTopRef.current - 2;
      lastScrollTopRef.current = el.scrollTop;
      if (goingUp && distance > NEAR_PX) stickToBottomRef.current = false;
      else if (distance <= NEAR_PX) stickToBottomRef.current = true;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const content = el.firstElementChild as HTMLElement | null;
    if (!content) return;
    let raf = 0;
    const follow = () => {
      if (!stickToBottomRef.current) return;
      raf = requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    };
    const ro = new ResizeObserver(follow);
    ro.observe(content);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // On NEW message boundaries only, re-arm sticky and smooth-scroll.
  // (Do NOT depend on `thinking` — on Android the keyboard/URL-bar resize
  // already nudges the viewport, and an extra smooth scroll on every
  // thinking flip reads as the page "scrolling on its own".)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottomRef.current = true;
    lastScrollTopRef.current = el.scrollHeight;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);



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
      const err = e as Error & { status?: number };
      if (err.name === "AbortError") { /* user cancelled */ }
      else if (err.status === 401) {
        toast.error("Please sign in to chat.");
        nav({ to: "/auth" });
      } else {
        toast.error(err.message || "Something went wrong. Try again.");
      }
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
    currentLangCode: effectiveLang,
  });


  return (
    <main
      className="relative flex flex-col overflow-hidden"
      style={{ background: "#000", color: "#ffffff", height: "100dvh", overscrollBehavior: "none", touchAction: "pan-y" }}

    >
      {/* Ambient gradient glow */}
      <div className={`chat-ambient ${thinking ? "is-streaming" : ""}`} aria-hidden />

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
        onSelectLanguage={(code) => update({ botLanguages: { ...(settings.botLanguages || {}), [bot.id]: code } })}
        activeLanguage={effectiveLang}
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
      <section ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-40 pt-5" style={{ WebkitOverflowScrolling: "touch" }}>
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
            <div className="flex items-center gap-2">
              {!settings.focusMode && <Mascot size={32} />}
              <div className="flex items-center gap-2 rounded-2xl px-3 py-2"
                style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}>
                <span className="stream-spinner" aria-hidden />
                <span className="stream-text is-streaming text-[13px] font-medium">thinking</span>
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
        <div className="mx-auto w-full max-w-lg">
          {detectedLang && detectedLang !== effectiveLang && !dismissedLangs.has(detectedLang) && (() => {
            const meta = LANGUAGES.find((l) => l.code === detectedLang);
            if (!meta) return null;
            return (
              <div className="mb-2 flex items-center justify-center gap-2 animate-fade-up">
                <button
                  onClick={() => {
                    update({ botLanguages: { ...(settings.botLanguages || {}), [bot.id]: detectedLang } });
                    toast.success(`Replying in ${meta.label}`);
                    setDetectedLang(null);
                  }}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold"
                  style={{ background: "var(--butter)", color: "var(--ink)" }}
                >
                  <span>{meta.flag}</span>
                  Reply in {meta.native}
                </button>
                <button
                  onClick={() => setDismissedLangs((prev) => new Set(prev).add(detectedLang))}
                  className="rounded-full px-2 py-1 text-[11px] opacity-60 hover:opacity-100"
                  aria-label="Dismiss language suggestion"
                >
                  Dismiss
                </button>
              </div>
            );
          })()}

          {/* Attached documents */}
          {docs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {docs.map((d) => (
                <span
                  key={d.id}
                  className="flex max-w-[220px] items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px]"
                  style={{ background: "color-mix(in oklab, var(--cream) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--cream) 16%, transparent)" }}
                  title={`${d.name} — ${d.pages} pages`}
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{d.name}</span>
                  <span className="opacity-60">· {d.pages}p</span>
                  <button
                    onClick={() => setDocs((prev) => prev.filter((x) => x.id !== d.id))}
                    aria-label="Remove document"
                    className="ml-0.5 opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length === 0) return;
              setUploadingDoc(true);
              try {
                for (const file of files) {
                  if (file.size > 20 * 1024 * 1024) {
                    toast.error(`${file.name} is over 20MB.`);
                    continue;
                  }
                  const doc = await extractPdfText(file);
                  if (!doc.text.trim()) {
                    toast.error(`${file.name}: no readable text (scanned PDF?)`);
                    continue;
                  }
                  setDocs((prev) => [...prev, doc]);
                  toast.success(`${file.name} added — ask me anything about it.`);
                }
              } catch (err) {
                toast.error(`Couldn't read PDF: ${(err as Error).message}`);
              } finally {
                setUploadingDoc(false);
              }
            }}
          />

          <div className="flex items-center gap-2 rounded-full py-1.5 pl-2 pr-1.5"
            style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)", border: "1px solid color-mix(in oklab, var(--cream) 12%, transparent)" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingDoc}
            aria-label="Attach PDF"
            className="flex h-9 w-9 items-center justify-center rounded-full transition disabled:opacity-50"
            style={{ background: "color-mix(in oklab, var(--cream) 10%, transparent)", color: "var(--cream)" }}
          >
            {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          </button>

          <input
            ref={inputRef}

            value={input}
            onChange={(e) => {
              const v = e.target.value;
              setInput(v);
              bumpActivity();
              const guess = detectLanguage(v);
              setDetectedLang(guess && guess !== effectiveLang ? guess : null);
            }}
            onKeyDown={(e) => { bumpActivity(); if (e.key === "Enter") send(); }}
            onFocus={() => { setFocused(true); bumpActivity(); }}
            onBlur={() => setFocused(false)}
            placeholder={transcribing ? "…" : listening ? "…" : t(effectiveLang, "compose.placeholder")}
            className="flex-1 bg-transparent py-2.5 text-[14.5px] outline-none placeholder:opacity-40"
            style={{ color: "var(--cream)" }}
            dir={isRTL(effectiveLang) ? "rtl" : "ltr"}
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
          className="msg-user max-w-[78%] rounded-[22px] rounded-tr-lg px-4 py-2.5"
          style={{ background: "color-mix(in oklab, var(--cream) 5%, transparent)", color: "var(--cream)" }}
        >
          {m.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <BotAvatar bot={bot} size={30} eager emojiSize={14} />
      <div className="max-w-[86%] flex-1">
        <div className="msg-assistant">
          {m.content.split("\n").map((line, i) => (
            <p key={i} className={i > 0 ? "mt-3" : ""}>
              {isLast ? <StreamText text={line} /> : line}
            </p>
          ))}
        </div>
        {/* Suggested follow-up chips */}
        {isLast && quickChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {quickChips.map((c, i) => (
              <button
                key={i}
                onClick={() => onQuickAsk(c)}
                className="rounded-full border px-3 py-1 text-[11.5px] font-medium tracking-[-0.005em]"
                style={{ borderColor: "color-mix(in oklab, var(--cream) 18%, transparent)", background: "color-mix(in oklab, var(--cream) 4%, transparent)", color: "var(--cream)" }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 flex items-center gap-3 pl-0.5 opacity-50">
          <button aria-label="Like" className="hover:opacity-100"><ThumbsUp className="h-3.5 w-3.5" /></button>
          <button aria-label="Dislike" className="hover:opacity-100"><ThumbsDown className="h-3.5 w-3.5" /></button>
          <button aria-label="Forget this" onClick={onForget} className="ml-auto hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}

