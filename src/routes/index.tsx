import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Plus, Settings2, Check, ChevronDown,
  PenLine, Lightbulb, Code2, GraduationCap, MapPin, Languages,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Composer } from "@/components/askeasy/Composer";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { CameraSheet } from "@/components/askeasy/CameraSheet";
import { UpgradeDialog } from "@/components/askeasy/UpgradeDialog";
import { AccountMenu } from "@/components/askeasy/AccountMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useConversation, useSettings, useUsage, useAuthUser,
  sendToAI, quotaCheck, modelTier, canUseLanguage, trialActive, trialDaysLeft,
  type Attachment, type Message,
} from "@/lib/askeasy";
import { getMe, appendMessage, clearMessages, bumpUsage, listMessages } from "@/lib/pro.functions";
import { LANGUAGES, type LangCode } from "@/lib/i18n";

export const Route = createFileRoute("/")({ component: Home });

type Category = {
  id: string;
  title: string;
  hint: string;
  prompt: string;
  icon: React.ReactNode;
  size: "wide" | "square";
  tone: "butter" | "lavender" | "ink" | "cream";
};

const CATEGORIES: Category[] = [
  {
    id: "write",
    title: "Write",
    hint: "Stories, emails, blogs",
    prompt: "Help me write ",
    icon: <PenLine className="h-5 w-5" />,
    size: "wide",
    tone: "butter",
  },
  {
    id: "ideas",
    title: "Ideas",
    hint: "Brainstorm anything",
    prompt: "Give me 10 fresh ideas for ",
    icon: <Lightbulb className="h-5 w-5" />,
    size: "square",
    tone: "lavender",
  },
  {
    id: "code",
    title: "Code",
    hint: "Debug or build",
    prompt: "Help me with this code: ",
    icon: <Code2 className="h-5 w-5" />,
    size: "square",
    tone: "cream",
  },
  {
    id: "learn",
    title: "Learn",
    hint: "Explain any concept",
    prompt: "Explain in simple terms: ",
    icon: <GraduationCap className="h-5 w-5" />,
    size: "square",
    tone: "ink",
  },
  {
    id: "plan",
    title: "Plan",
    hint: "Trips, days, projects",
    prompt: "Help me plan ",
    icon: <MapPin className="h-5 w-5" />,
    size: "square",
    tone: "cream",
  },
];

function Home() {
  const { settings, update, hydrated } = useSettings();
  const { messages, addMessage, updateMessage, clear } = useConversation();
  const { usage, bump, resetUsage } = useUsage();
  const user = useAuthUser();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [composerDraft, setComposerDraft] = useState<string>("");
  const [serverIsPro, setServerIsPro] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMe = useServerFn(getMe);
  const fetchMessages = useServerFn(listMessages);
  const appendMsg = useServerFn(appendMessage);
  const clearMsgs = useServerFn(clearMessages);
  const bumpSrv = useServerFn(bumpUsage);

  const isPro = user ? serverIsPro : settings.isPro;

  useEffect(() => {
    if (!user) { setServerIsPro(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchMe();
        if (cancelled) return;
        setServerIsPro(!!me.profile.is_pro);
        resetUsage();
        if (me.usage.text) bump("text", me.usage.text);
        if (me.usage.media) bump("media", me.usage.media);
        if (me.usage.voice) bump("voice", me.usage.voice);
        const rows = await fetchMessages();
        if (cancelled) return;
        if (rows.length) {
          clear();
          for (const r of rows) {
            addMessage({
              role: r.role as "user" | "assistant",
              content: r.content,
              attachments: (r.attachments as unknown as Attachment[]) ?? [],
            });
          }
        }
      } catch (e) { console.error("cloud sync failed", e); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const openUpgrade = useCallback((reason?: string) => {
    if (isPro) { toast.success("You're already on Pro ⚡"); return; }
    setUpgradeReason(reason);
    setUpgradeOpen(true);
  }, [isPro]);

  const clearConversation = useCallback(() => {
    clear();
    if (user) clearMsgs().catch(() => {});
    if (!user) resetUsage();
  }, [clear, clearMsgs, resetUsage, user]);

  const selectLanguage = useCallback((code: LangCode) => {
    if (code === settings.language) return;
    if (code === "en") {
      update({ language: "en" });
      toast.success("Switched to English");
      return;
    }
    // Non-English language selection: check trial + Pro.
    if (!isPro && !trialActive(settings) && settings.trialStartedAt) {
      openUpgrade("Your 3-day language trial has ended. Upgrade to Pro to keep replying in other languages.");
      return;
    }
    // First-time non-English: start trial.
    const patch: Partial<typeof settings> = { language: code };
    if (!settings.trialStartedAt && !isPro) {
      patch.trialStartedAt = Date.now();
    }
    update(patch);
    const active = LANGUAGES.find((l) => l.code === code);
    if (active) {
      const trialMsg = !isPro && !settings.trialStartedAt
        ? "3-day free trial started."
        : !isPro && trialActive(settings)
          ? `${trialDaysLeft(settings)} day${trialDaysLeft(settings) === 1 ? "" : "s"} left in trial.`
          : "";
      toast.success(`Replying in ${active.native}`, {
        description: trialMsg || `Answers will generate in ${active.label}.`,
        duration: 2000,
      });
    }
  }, [isPro, settings, update, openUpgrade]);

  const send = async (text: string, attachments: Attachment[]) => {
    if (!text && attachments.length === 0) return;

    // Language gate — if selected language is locked, force back to English + prompt upgrade.
    if (!canUseLanguage(settings, settings.language, isPro)) {
      update({ language: "en" });
      openUpgrade("Your language trial has ended. Upgrade to Pro to reply in other languages.");
      return;
    }

    const currentTier = modelTier(settings.openRouterModel);
    if (!isPro && currentTier === "free") {
      const { overLimit } = quotaCheck(usage, text, attachments);
      if (overLimit.length > 0) {
        const kind = overLimit[0] === "text" ? "text messages" : overLimit[0] === "media" ? "image/file uploads" : "voice notes";
        openUpgrade(`You've used all free ${kind} for today. Upgrade to keep going.`);
        return;
      }
    }

    const mediaN = attachments.filter((a) => a.type === "image" || a.type === "file").length;
    const voiceN = attachments.filter((a) => a.type === "audio").length;
    if (!isPro) {
      if (text.trim().length > 0) { bump("text"); if (user) bumpSrv({ data: { kind: "text", n: 1 } }).catch(() => {}); }
      if (mediaN > 0) { bump("media", mediaN); if (user) bumpSrv({ data: { kind: "media", n: mediaN } }).catch(() => {}); }
      if (voiceN > 0) { bump("voice", voiceN); if (user) bumpSrv({ data: { kind: "voice", n: voiceN } }).catch(() => {}); }
    }

    addMessage({ role: "user", content: text, attachments });
    setPendingAttachments([]);
    setComposerDraft("");
    if (user) appendMsg({ data: { role: "user", content: text, attachments } }).catch(() => {});

    const placeholder = addMessage({ role: "assistant", content: "" });
    setThinking(true);

    try {
      const reply = await sendToAI({
        messages: [...messages, { id: "tmp", role: "user", content: text, attachments, createdAt: Date.now() }],
        settings,
      });
      updateMessage(placeholder.id, { content: reply });
      if (user) appendMsg({ data: { role: "assistant", content: reply } }).catch(() => {});
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate([18, 40, 18]); } catch { /* noop */ }
      }
    } catch (e) {
      updateMessage(placeholder.id, { content: "Something went wrong. Please try again." });
      console.error(e);
    } finally {
      setThinking(false);
    }
  };

  const hasConversation = messages.length > 0;
  const activeLanguage = LANGUAGES.find((l) => l.code === settings.language) ?? LANGUAGES[0];

  if (!hydrated) return <div className="min-h-dvh bg-background" />;

  const firstName = settings.name || user?.name?.split(" ")[0] || "friend";
  const greeting = `How can I help,`;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Header */}
      <header className="relative z-30 flex items-center justify-between gap-2 px-4 pt-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-2xl"
            style={{ background: "var(--butter)" }}
            aria-hidden
          >
            <span className="block h-2.5 w-2.5 rounded-full" style={{ background: "var(--ink)" }} />
          </div>
          <span className="font-display text-[1.05rem] tracking-tight text-foreground">AskEasy</span>
        </div>

        <div className="flex items-center gap-1.5">
          <LanguagePicker active={activeLanguage} onSelect={selectLanguage} isPro={isPro} settings={settings} />
          <button
            onClick={clearConversation}
            className="hidden h-9 items-center gap-1 rounded-full border border-border/60 px-3 text-[12.5px] font-medium text-foreground/80 transition hover:bg-foreground/[0.04] sm:flex"
            title="New conversation"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <AccountMenu />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 text-foreground/70 transition hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      {hasConversation ? (
        <section ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 pb-40 pt-6 sm:px-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} thinking={thinking && m.role === "assistant"} />
            ))}
          </div>
        </section>
      ) : (
        <section className="relative z-10 flex-1 overflow-y-auto px-4 pb-40 pt-8 sm:px-6">
          <div className="mx-auto w-full max-w-md">
            {/* Greeting */}
            <div className="animate-fade-up mb-6 space-y-1.5" style={{ animationDelay: "0.05s" }}>
              <p className="text-[13px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 18 ? "Good afternoon" : "Good evening"}
              </p>
              <h1 className="font-display text-[2.25rem] leading-[1.05] tracking-tight text-foreground sm:text-[2.6rem]">
                {greeting}
                <br />
                <span className="text-foreground/60">{firstName}?</span>
              </h1>
            </div>

            {/* Bento grid */}
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map((c, idx) => (
                <button
                  key={c.id}
                  onClick={() => setComposerDraft(c.prompt)}
                  className={
                    "animate-tile-in group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] p-5 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] " +
                    (c.size === "wide" ? "col-span-2 h-36" : "h-40") + " " +
                    toneClass(c.tone)
                  }
                  style={{ animationDelay: `${0.08 + idx * 0.05}s` }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.08)" }}
                  >
                    <span className="[&_svg]:h-5 [&_svg]:w-5" style={{ color: c.tone === "ink" ? "var(--butter)" : "var(--ink)" }}>
                      {c.icon}
                    </span>
                  </div>
                  <div>
                    <div className="font-display text-[1.35rem] leading-tight">{c.title}</div>
                    <div className="mt-0.5 text-[12.5px] opacity-70">{c.hint}</div>
                  </div>
                  {c.tone === "butter" && (
                    <span className="absolute right-4 top-4 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ background: "rgba(0,0,0,0.12)", color: "var(--ink)" }}>
                      Popular
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Small footer chip */}
            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Powered by OpenRouter</span>
              <span aria-hidden>·</span>
              <span>{isPro ? "Pro" : "Free"} plan</span>
            </div>
          </div>
        </section>
      )}

      {/* Composer */}
      <div
        className={
          "z-10 px-4 pb-6 pt-4 sm:px-6 " +
          (hasConversation
            ? "fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent"
            : "animate-fade-up relative")
        }
        style={hasConversation ? undefined : { animationDelay: "0.4s" }}
      >
        <Composer
          onSend={send}
          disabled={thinking}
          onOpenCamera={() => setCameraOpen(true)}
          externalAttachments={pendingAttachments}
          onAddAttachments={(a) => setPendingAttachments((prev) => [...prev, ...a])}
          onRemoveAttachment={(id) => setPendingAttachments((prev) => prev.filter((att) => att.id !== id))}
          onActivityChange={() => { /* noop for now */ }}
          placeholder="Ask me anything…"
          thinkingLabel="Thinking…"
          draft={composerDraft}
        />
        {!hasConversation && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
            AskEasy can make mistakes. Verify important info.
          </p>
        )}
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        update={update}
        isProEffective={isPro}
        usage={usage}
        onUpgrade={() => { setSettingsOpen(false); openUpgrade(); }}
        onClearConversation={() => { clearConversation(); setSettingsOpen(false); }}
        onSelectLanguage={selectLanguage}
      />

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={upgradeReason}
        labels={{ title: "Upgrade to Pro", cta: "Continue to checkout", opening: "Opening secure checkout…" }}
      />

      <CameraSheet
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(dataUrl) => {
          setPendingAttachments((prev) => [
            ...prev,
            { id: crypto.randomUUID(), type: "image", dataUrl, name: "camera.jpg" },
          ]);
          setCameraOpen(false);
        }}
      />
    </main>
  );
}

function toneClass(tone: "butter" | "lavender" | "ink" | "cream"): string {
  switch (tone) {
    case "butter":
      return "bg-[color:var(--butter)] text-[color:var(--ink)] shadow-[0_20px_50px_-25px_rgba(247,201,72,0.6)]";
    case "lavender":
      return "bg-[color:var(--lavender)] text-[color:var(--ink)] shadow-[0_20px_50px_-25px_rgba(201,160,220,0.5)]";
    case "ink":
      return "bg-[color:var(--ink)] text-[color:var(--cream)]";
    case "cream":
    default:
      return "bg-card text-foreground border border-border/60";
  }
}

function LanguagePicker({
  active, onSelect, isPro, settings,
}: {
  active: (typeof LANGUAGES)[number];
  onSelect: (code: LangCode) => void;
  isPro: boolean;
  settings: import("@/lib/askeasy").Settings;
}) {
  const inTrial = trialActive(settings);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-9 items-center gap-1.5 rounded-full border border-border/60 px-2.5 text-[12.5px] font-medium text-foreground/85 transition hover:bg-foreground/[0.04]"
          title={`Reply language: ${active.label}`}
        >
          <span className="text-sm leading-none">{active.flag}</span>
          <span className="max-w-[64px] truncate">{active.native}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(20rem,calc(100vw-2rem))] rounded-3xl border-border/60 p-2">
        <div className="mb-2 flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <Languages className="h-3 w-3" /> Reply language
          </div>
          {!isPro && settings.language !== "en" && (
            <span className="text-[10px] font-medium text-foreground/70">
              {inTrial ? `${trialDaysLeft(settings)}d trial` : "Trial ended"}
            </span>
          )}
        </div>
        <div className="grid max-h-[16rem] grid-cols-2 gap-1 overflow-y-auto pr-1">
          {LANGUAGES.map((l) => {
            const selected = active.code === l.code;
            const locked = l.code !== "en" && !isPro && !inTrial && !!settings.trialStartedAt;
            return (
              <button
                key={l.code}
                onClick={() => onSelect(l.code)}
                className={
                  "flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-[12.5px] transition " +
                  (selected
                    ? "border-foreground bg-foreground/[0.06] text-foreground"
                    : "border-border/50 text-foreground/85 hover:bg-foreground/[0.04]")
                }
              >
                <span className="text-sm leading-none">{l.flag}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{l.native}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{l.label}</span>
                </span>
                {selected && <Check className="h-3 w-3 text-foreground" />}
                {locked && !selected && <span className="text-[9px] font-semibold uppercase text-muted-foreground">Pro</span>}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MessageBubble({ message, thinking }: { message: Message; thinking: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed " +
          (isUser
            ? "bg-[color:var(--ink)] text-[color:var(--cream)] dark:bg-[color:var(--cream)] dark:text-[color:var(--ink)]"
            : "bg-card text-foreground border border-border/60")
        }
      >
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((a) =>
              a.type === "image" ? (
                <img key={a.id} src={a.dataUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
              ) : (
                <div key={a.id} className="rounded-full bg-background/20 px-3 py-1 text-xs">
                  {a.name ?? a.type}
                </div>
              ),
            )}
          </div>
        )}
        {thinking && !message.content ? (
          <div className="flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:120ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current opacity-60 [animation-delay:240ms]" />
          </div>
        ) : (
          <div className="whitespace-pre-wrap">{message.content}</div>
        )}
      </div>
    </div>
  );
}
