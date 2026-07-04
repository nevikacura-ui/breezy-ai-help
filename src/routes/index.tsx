import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Settings2, Plus, ChevronDown, Check } from "lucide-react";
import { Orb } from "@/components/askeasy/Orb";
import { Bubble } from "@/components/askeasy/Bubble";
import { Composer } from "@/components/askeasy/Composer";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { CameraSheet } from "@/components/askeasy/CameraSheet";
import {
  useConversation,
  useSettings,
  sendToAI,
  type Attachment,
  type Message,
} from "@/lib/askeasy";

export const Route = createFileRoute("/")({
  component: Home,
});

const SUGGESTIONS = [
  "Explain something in simple words",
  "Plan my day",
  "Help me write a message",
  "Summarize this photo",
];

type ModelTier = {
  id: string;
  label: string;
  hint: string;
  tier: "free" | "pro";
};

const MODELS: ModelTier[] = [
  { id: "askeasy/smart", label: "Smart", hint: "Balanced everyday answers", tier: "free" },
  { id: "askeasy/pro", label: "Pro", hint: "Deep reasoning & long context", tier: "pro" },
  { id: "askeasy/eco", label: "Eco", hint: "Fast & lightweight", tier: "free" },
];


function Home() {
  const { settings, update, hydrated } = useSettings();
  const { messages, addMessage, updateMessage, clear } = useConversation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking]);

  const send = async (text: string, attachments: Attachment[]) => {
    if (!text && attachments.length === 0) return;
    addMessage({ role: "user", content: text, attachments });
    setPendingAttachments([]);

    const placeholder = addMessage({ role: "assistant", content: "" });
    setThinking(true);
    try {
      const reply = await sendToAI({
        messages: [
          ...messages,
          {
            id: "tmp",
            role: "user",
            content: text,
            attachments,
            createdAt: Date.now(),
          },
        ],
        settings,
      });
      updateMessage(placeholder.id, { content: reply });
    } catch (e) {
      updateMessage(placeholder.id, {
        content: "Something went wrong. Please try again.",
      });
      console.error(e);
    } finally {
      setThinking(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 4)
      .forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          setPendingAttachments((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "image",
              dataUrl: String(reader.result),
              name: file.name,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
  };

  const hasConversation = messages.length > 0;
  const greetingName = settings.name.trim() || "there";
  const currentModel =
    MODELS.find((m) => m.id === settings.openRouterModel) ?? MODELS[0];

  if (!hydrated) return <div className="min-h-dvh bg-background" />;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.8 0.12 300 / 0.5), transparent 70%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-30 flex items-center justify-between gap-2 px-4 pt-5">
        <button
          onClick={clear}
          className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground/80 transition hover:text-foreground"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>

        {/* Model selector — centerpiece */}
        <div className="relative">
          <button
            onClick={() => setModelOpen((v) => !v)}
            className="glass flex h-9 items-center gap-2 rounded-full pl-2 pr-3 text-[13px] font-medium text-foreground transition"
          >
            <Bubble size={18} state="idle" />
            <span>{currentModel.label}</span>
            <ChevronDown
              className={
                "h-3.5 w-3.5 text-foreground/60 transition " +
                (modelOpen ? "rotate-180" : "")
              }
            />
          </button>

          {modelOpen && (
            <>
              <button
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setModelOpen(false)}
              />
              <div className="glass animate-fade-up absolute left-1/2 top-11 z-20 w-64 -translate-x-1/2 rounded-2xl p-1.5 shadow-[0_20px_60px_-20px_oklch(0.2_0.05_280/0.4)]">
                {MODELS.map((m) => {
                  const active = m.id === settings.openRouterModel;
                  const isPro = m.tier === "pro";
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        update({ openRouterModel: m.id });
                        setModelOpen(false);
                      }}
                      className={
                        "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition " +
                        (active ? "bg-foreground/10" : "hover:bg-foreground/5")
                      }
                      style={
                        isPro
                          ? {
                              boxShadow:
                                "inset 0 0 0 1px transparent",
                              backgroundImage: active
                                ? "linear-gradient(var(--card), var(--card)), conic-gradient(from 0deg, oklch(0.78 0.2 30), oklch(0.72 0.22 300), oklch(0.78 0.2 200), oklch(0.82 0.2 90), oklch(0.78 0.2 30))"
                                : undefined,
                              backgroundOrigin: active ? "border-box" : undefined,
                              backgroundClip: active ? "padding-box, border-box" : undefined,
                              border: active ? "1px solid transparent" : undefined,
                            }
                          : undefined
                      }
                    >
                      <Bubble size={22} state={isPro ? "active" : "idle"} />
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-foreground">
                            {m.label}
                          </span>
                          {isPro && (
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                              style={{ background: "var(--send-gradient)" }}
                            >
                              Pro
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {m.hint}
                        </div>
                      </div>
                      {active && <Check className="h-3.5 w-3.5 text-foreground/70" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:text-foreground"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>


      {/* Content */}
      {hasConversation ? (
        <section
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto px-4 pb-40 pt-6"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                thinking={thinking && m.role === "assistant" && !m.content}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <Orb size={240} intense />
          </div>

          <h1
            className="font-display animate-fade-up mt-8 text-[2rem] leading-[1.05] tracking-tight text-foreground sm:text-5xl"
            style={{ animationDelay: "0.15s" }}
          >
            Hey {greetingName},
            <br />
            <span className="italic text-foreground/90">what can I help with?</span>
          </h1>

          <p
            className="animate-fade-up mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground"
            style={{ animationDelay: "0.25s" }}
          >
            Ask anything. Speak it, snap it, or type it — the right AI answers instantly.
          </p>

          <div
            className="animate-fade-up mt-8 flex max-w-lg flex-wrap justify-center gap-2"
            style={{ animationDelay: "0.35s" }}
          >
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s, [])}
                className="glass rounded-full px-3.5 py-1.5 text-[12px] font-medium text-foreground/75 transition hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Composer */}
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
          onAddAttachments={(a) =>
            setPendingAttachments((prev) => [...prev, ...a])
          }
          onRemoveAttachment={(id) =>
            setPendingAttachments((prev) => prev.filter((att) => att.id !== id))
          }
        />
        {!hasConversation && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
            AskEasy can make mistakes. Verify important info.
          </p>
        )}
      </div>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        update={update}
        onClearConversation={() => {
          clear();
          setSettingsOpen(false);
        }}
      />

      <CameraSheet
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(dataUrl) => {
          setPendingAttachments((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              type: "image",
              dataUrl,
              name: "photo.jpg",
            },
          ]);
        }}
      />
    </main>
  );
}

function MessageBubble({
  message,
  thinking,
}: {
  message: Message;
  thinking: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <div className={"flex w-full " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "flex max-w-[85%] flex-col gap-2 " +
          (isUser ? "items-end" : "items-start")
        }
      >
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((a) =>
              a.type === "image" ? (
                <img
                  key={a.id}
                  src={a.dataUrl}
                  alt=""
                  className="max-h-56 rounded-2xl object-cover"
                />
              ) : (
                <audio key={a.id} src={a.dataUrl} controls className="h-10" />
              ),
            )}
          </div>
        )}
        {(message.content || thinking) && (
          <div
            className={
              isUser
                ? "rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-primary-foreground"
                : "whitespace-pre-wrap px-1 text-[15px] leading-relaxed text-foreground"
            }
          >
            {thinking ? (
              <span className="inline-flex items-center gap-2 text-foreground/60">
                <Bubble size={18} state="thinking" />
                <span className="text-[13px]">Thinking…</span>
              </span>
            ) : (
              message.content
            )}
          </div>
        )}
      </div>
    </div>
  );
}
