import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Check, Languages, Plus, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Orb } from "@/components/askeasy/Orb";
import { Composer } from "@/components/askeasy/Composer";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { CameraSheet } from "@/components/askeasy/CameraSheet";
import { Typewriter } from "@/components/askeasy/Typewriter";
import { UpgradeDialog } from "@/components/askeasy/UpgradeDialog";
import { AccountMenu } from "@/components/askeasy/AccountMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import tricolorRing from "@/assets/tricolor-ring.png.asset.json";
import {
  useConversation,
  useSettings,
  useUsage,
  useAuthUser,
  useI18n,
  sendToAI,
  quotaCheck,
  modelTier,
  resetIndiaModeArtifacts,
  type Attachment,
  type Message,
} from "@/lib/askeasy";
import { getMe, appendMessage, clearMessages, bumpUsage, listMessages } from "@/lib/pro.functions";
import { LANGUAGES, type LangCode } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { settings, update, hydrated } = useSettings();
  const { messages, addMessage, updateMessage, clear } = useConversation();
  const { usage, bump, resetUsage } = useUsage();
  const user = useAuthUser();
  const t = useI18n(settings);
  const navigate = useNavigate();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<string | undefined>();
  const [thinking, setThinking] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [orbActive, setOrbActive] = useState(false);
  const [orbEnergized, setOrbEnergized] = useState(false);
  const [serverIsPro, setServerIsPro] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchMe = useServerFn(getMe);
  const fetchMessages = useServerFn(listMessages);
  const appendMsg = useServerFn(appendMessage);
  const clearMsgs = useServerFn(clearMessages);
  const bumpSrv = useServerFn(bumpUsage);

  const isPro = user ? serverIsPro : settings.isPro;

  // Domain routing: askindia.io visitors land on onboarding until they've
  // chosen India Mode. Once indiaMode is on, they enter the app directly.
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    const host = window.location.hostname.toLowerCase();
    const isIndiaDomain = host.includes("askindia");
    // Only send first-time askindia.io visitors to onboarding. Once they've
    // been through it (either enabled India Mode or chose "Continue in English"),
    // never redirect again — they can toggle India Mode from Settings.
    if (isIndiaDomain && !settings.indiaOnboarded) {
      navigate({ to: "/india" });
    }
  }, [hydrated, settings.indiaOnboarded, navigate]);

  // Cloud sync on login
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

  // Full client-side reset whenever India Mode transitions from on → off.
  const prevIndiaMode = useRef(settings.indiaMode);
  useEffect(() => {
    if (!hydrated) return;
    if (prevIndiaMode.current && !settings.indiaMode) {
      clear();
      if (user) clearMsgs().catch(() => {});
      setPendingAttachments([]);
      setThinking(false);
      resetIndiaModeArtifacts();
      toast.success("India Mode off", {
        description: "Language, chat, and drafts reset to English.",
        duration: 1800,
      });
    }
    prevIndiaMode.current = settings.indiaMode;
  }, [settings.indiaMode, hydrated, clear, clearMsgs, user]);

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

  const selectLanguage = useCallback((language: LangCode) => {
    update({ indiaMode: true, language, indiaOnboarded: true });
    const active = LANGUAGES.find((l) => l.code === language);
    if (active && language !== "en") {
      toast.success(`${active.label} enforced`, {
        description: `Replies will generate in ${active.native}.`,
        duration: 1600,
      });
    }
  }, [update]);

  const send = async (text: string, attachments: Attachment[]) => {
    if (!text && attachments.length === 0) return;

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
    if (user) appendMsg({ data: { role: "user", content: text, attachments } }).catch(() => {});

    const placeholder = addMessage({ role: "assistant", content: "" });
    setThinking(true);
    if (settings.indiaMode && settings.language !== "en") {
      const active = LANGUAGES.find((l) => l.code === settings.language);
      if (active) {
        toast.success(`${active.label} enforced`, {
          description: `Generating this answer in ${active.native}.`,
          duration: 1400,
        });
      }
    }
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

  const handleActivity = useCallback(
    ({ focused, hasInput }: { focused: boolean; hasInput: boolean }) => {
      setOrbActive(focused || hasInput);
      setOrbEnergized(hasInput);
    },
    [],
  );

  const hasConversation = messages.length > 0;

  if (!hydrated) return <div className="min-h-dvh bg-background" />;

  const welcomeText = settings.name
    ? t("welcome.name", { name: settings.name })
    : user?.name
      ? t("welcome.name", { name: user.name.split(" ")[0] })
      : t("welcome");

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-3xl transition-opacity duration-700"
        style={{ background: settings.indiaMode
          ? "radial-gradient(circle, rgba(255,153,51,0.35), transparent 70%)"
          : "radial-gradient(circle, oklch(0.78 0.22 145 / 0.35), transparent 70%)" }}
      />


      {/* Top bar */}
      <header className="relative z-30 flex items-center justify-between gap-2 px-4 pt-5">
        <button
          onClick={() => {
            clearConversation();
          }}
          className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground/80 transition hover:text-foreground"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("new")}
        </button>

        <div className="flex items-center gap-2">
          {settings.indiaMode && (() => {
            const active = LANGUAGES.find((l) => l.code === settings.language);
            if (!active) return null;
            return (
              <QuickLanguagePicker active={active} onSelect={selectLanguage} />
            );
          })()}
          <AccountMenu />
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label={t("settings")}
            className="glass flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Content */}
      {hasConversation ? (
        <section ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 pb-40 pt-6">
          <div
            key={`msgs-${settings.indiaMode ? "india" : "std"}-${settings.theme}`}
            className="mx-auto flex max-w-2xl flex-col gap-4"
          >
            {messages.map((m) => (
              <MessageBubble
                key={`${settings.indiaMode ? "india" : "std"}-${settings.theme}-${m.id}`}
                message={m}
                thinking={thinking && m.role === "assistant"}
              />
            ))}
          </div>
        </section>
        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          {/* Ambient concentric rings behind the orb — voice-visualizer vibe */}
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden
              className="absolute h-[380px] w-[380px] rounded-full border border-primary/10 animate-pulse-soft"
              style={{ animationDuration: "4s" }}
            />
            <div
              aria-hidden
              className="absolute h-[300px] w-[300px] rounded-full border border-primary/15 animate-pulse-soft"
              style={{ animationDuration: "3s", animationDelay: "0.4s" }}
            />
            <div className="animate-fade-in animate-breathe relative" style={{ animationDelay: "0.1s" }}>
              <Orb size={220} intense active={orbActive} energized={orbEnergized} />
            </div>
          </div>

          <div className="animate-fade-up mt-12 space-y-3" style={{ animationDelay: "0.3s" }}>
            <h1 className="font-display text-[2.25rem] font-light leading-[1.05] tracking-[-0.04em] text-foreground sm:text-[3.25rem]">
              {welcomeText}
            </h1>
            <p className="mx-auto flex min-h-[1.6em] max-w-md items-baseline justify-center gap-2 text-[15px] font-light tracking-tight text-muted-foreground sm:text-base">
              <span>{t("tagline")}</span>
              <Typewriter
                phrases={[
                  t("typewriter.1"),
                  t("typewriter.2"),
                  t("typewriter.3"),
                  t("typewriter.4"),
                  t("typewriter.5"),
                  t("typewriter.6"),
                ]}
                className="font-medium text-foreground/85"
              />
            </p>
            <div className="pt-3 text-[11px] uppercase tracking-[0.32em] text-muted-foreground/60">
              Hold the ring · tap to type
            </div>
          </div>
        </section>


      {/* Composer — nothing rendered above the input other than page content */}
      <div
        className={
          "z-10 px-4 pb-6 pt-4 " +
          (hasConversation
            ? "fixed inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/90 to-transparent"
            : "animate-fade-up relative")
        }
        style={hasConversation ? undefined : { animationDelay: "0.45s" }}
      >
        <Composer
          onSend={send}
          disabled={thinking}
          onOpenCamera={() => setCameraOpen(true)}
          externalAttachments={pendingAttachments}
          onAddAttachments={(a) => setPendingAttachments((prev) => [...prev, ...a])}
          onRemoveAttachment={(id) => setPendingAttachments((prev) => prev.filter((att) => att.id !== id))}
          onActivityChange={handleActivity}
          placeholder={t("compose.placeholder")}
          thinkingLabel={t("compose.thinking")}
          indiaMode={settings.indiaMode}
        />
        {!hasConversation && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
            {t("footer.disclaimer")}
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
        onIndiaModeOff={() => {
          clearConversation();
          toast.success("India Mode off", {
            description: "Chat and language reset to English.",
            duration: 1600,
          });
        }}
        onUpgrade={() => { setSettingsOpen(false); openUpgrade(); }}
        onClearConversation={() => {
          clearConversation();
          setSettingsOpen(false);
        }}
      />

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        reason={upgradeReason}
        labels={{ title: t("upgrade.title"), cta: t("upgrade.cta"), opening: t("upgrade.opening") }}
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

function QuickLanguagePicker({
  active,
  onSelect,
}: {
  active: (typeof LANGUAGES)[number];
  onSelect: (language: LangCode) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="glass flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-foreground/80 transition hover:text-foreground"
          title={`Language: ${active.label}`}
          aria-label={`Language: ${active.label}. Change language.`}
        >
          <img src={tricolorRing.url} alt="" draggable={false} className="h-4 w-4 select-none" />
          <span className="max-w-[86px] truncate">{active.native}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="glass w-[min(22rem,calc(100vw-2rem))] rounded-3xl border-border/60 p-2">
        <div className="mb-2 flex items-center gap-2 px-2 py-1 text-[12px] font-medium text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
          Reply language
        </div>
        <div className="grid max-h-[19rem] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
          {LANGUAGES.filter((l) => l.code !== "en").map((l) => {
            const selected = active.code === l.code;
            return (
              <button
                key={l.code}
                onClick={() => onSelect(l.code)}
                className={
                  "relative rounded-2xl border px-2 py-2 text-center text-[12px] leading-tight transition " +
                  (selected
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/60 text-foreground/80 hover:bg-foreground/[0.04]")
                }
              >
                {selected && <Check className="absolute right-1.5 top-1.5 h-3 w-3 text-primary" />}
                <div className="font-medium">{l.native}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">{l.label}</div>
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
          (isUser ? "bg-foreground text-background" : "glass text-foreground")
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
        <div className="flex items-start gap-2">
          {message.content && <span className="whitespace-pre-wrap flex-1">{message.content}</span>}
          {thinking && (
            <img
              src={tricolorRing.url}
              alt=""
              draggable={false}
              className="h-5 w-5 shrink-0 select-none animate-spin [animation-duration:1.6s]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
