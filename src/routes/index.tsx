import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
import { Settings2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Orb } from "@/components/askeasy/Orb";
import { Composer } from "@/components/askeasy/Composer";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { CameraSheet } from "@/components/askeasy/CameraSheet";
import { Typewriter } from "@/components/askeasy/Typewriter";
import { ModelPill } from "@/components/askeasy/ModelPill";
import {
  useConversation,
  useSettings,
  useUsage,
  sendToAI,
  quotaCheck,
  modelTier,
  type Attachment,
  type Message,
  type ModelId,
} from "@/lib/askeasy";

export const Route = createFileRoute("/")({
  component: Home,
});


function Home() {
  const { settings, update, hydrated } = useSettings();
  const { messages, addMessage, updateMessage, clear } = useConversation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [orbActive, setOrbActive] = useState(false);
  const [orbEnergized, setOrbEnergized] = useState(false);
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

  const handleActivity = useCallback(
    ({ focused, hasInput }: { focused: boolean; hasInput: boolean }) => {
      setOrbActive(focused || hasInput);
      setOrbEnergized(hasInput);
    },
    [],
  );

  const hasConversation = messages.length > 0;

  if (!hydrated) return <div className="min-h-dvh bg-background" />;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-50 blur-3xl transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle, oklch(0.8 0.12 300 / 0.5), transparent 70%)",
        }}
      />

      {/* Top bar — minimal: New + Settings */}
      <header className="relative z-30 flex items-center justify-between gap-2 px-4 pt-5">
        <button
          onClick={clear}
          className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground/80 transition hover:text-foreground"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>

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
          <div className="animate-fade-in animate-breathe" style={{ animationDelay: "0.1s" }}>
            <Orb size={220} intense active={orbActive} energized={orbEnergized} />
          </div>

          <div className="animate-fade-up mt-10 space-y-4" style={{ animationDelay: "0.3s" }}>
            <h1 className="font-display text-[2.75rem] font-medium leading-[1.05] tracking-[-0.035em] text-foreground sm:text-6xl">
              Welcome{settings.name ? `, ${settings.name}` : ", Nevika"}
            </h1>
            <p className="mx-auto flex min-h-[1.6em] max-w-md items-baseline justify-center gap-2 text-lg font-light tracking-tight text-foreground/70 sm:text-xl">
              <span>I can</span>
              <Typewriter
                phrases={[
                  "answer anything, instantly.",
                  "summarize a long report.",
                  "draft that email for you.",
                  "explain it like you're five.",
                  "plan your next big idea.",
                  "turn thoughts into words.",
                ]}
                className="font-medium"
              />
            </p>
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
          onActivityChange={handleActivity}
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
              name: "camera.jpg",
            },
          ]);
          setCameraOpen(false);
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
    <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
      <div
        className={
          "max-w-[85%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed " +
          (isUser
            ? "bg-foreground text-background"
            : "glass text-foreground")
        }
      >
        {message.attachments && message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((a) =>
              a.type === "image" ? (
                <img
                  key={a.id}
                  src={a.dataUrl}
                  alt=""
                  className="h-24 w-24 rounded-xl object-cover"
                />
              ) : (
                <div
                  key={a.id}
                  className="rounded-full bg-background/20 px-3 py-1 text-xs"
                >
                  {a.name ?? a.type}
                </div>
              ),
            )}
          </div>
        )}
        {thinking ? (
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" />
            <span
              className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current"
              style={{ animationDelay: "0.15s" }}
            />
            <span
              className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current"
              style={{ animationDelay: "0.3s" }}
            />
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </div>
  );
}
