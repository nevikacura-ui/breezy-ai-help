import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Settings2, Plus } from "lucide-react";
import { Orb } from "@/components/askeasy/Orb";
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

function Home() {
  const { settings, update, hydrated } = useSettings();
  const { messages, addMessage, updateMessage, clear } = useConversation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
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

    // Optimistic assistant placeholder
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

  const hasConversation = messages.length > 0;
  const greetingName = settings.name.trim() || "there";

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
      <header className="relative z-20 flex items-center justify-between px-5 pt-5">
        <button
          onClick={clear}
          className="glass flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[13px] font-medium text-foreground/80 transition hover:text-foreground"
          title="New conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          AskEasy
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
              <MessageBubble key={m.id} message={m} thinking={thinking && m.role === "assistant" && !m.content} />
            ))}
          </div>
        </section>
      ) : (
        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="animate-fade-up" style={{ animationDelay: "0.05s" }}>
            <Orb size={240} intense />
          </div>

          <h1
            className="font-display mt-8 text-[2rem] leading-[1.05] tracking-tight text-foreground animate-fade-up sm:text-5xl"
            style={{ animationDelay: "0.15s" }}
          >
            Hey {greetingName},
            <br />
            <span className="italic text-foreground/90">what can I help with?</span>
          </h1>

          <p
            className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground animate-fade-up"
            style={{ animationDelay: "0.25s" }}
          >
            Ask anything. Speak it, snap it, or type it — Smart Mode picks the right AI for you.
          </p>

          <div
            className="mt-8 flex max-w-lg flex-wrap justify-center gap-2 animate-fade-up"
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
            : "relative animate-fade-up")
        }
        style={hasConversation ? undefined : { animationDelay: "0.45s" }}
      >
        <Composer
          onSend={send}
          disabled={thinking}
          onOpenCamera={() => setCameraOpen(true)}
          voiceEnabled={settings.voiceEnabled}
          smartMode={settings.smartMode}
          onToggleSmart={() => update({ smartMode: !settings.smartMode })}
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
          // Immediately add as a pending attachment via a synthetic send flow:
          // Simplest: send it directly with empty text prompt.
          send("", [
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

function MessageBubble({ message, thinking }: { message: Message; thinking: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={"flex w-full " + (isUser ? "justify-end" : "justify-start")}>
      <div className={"flex max-w-[85%] flex-col gap-2 " + (isUser ? "items-end" : "items-start")}>
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
                : "px-1 text-[15px] leading-relaxed text-foreground whitespace-pre-wrap"
            }
          >
            {thinking ? <ThinkingDots /> : message.content}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 text-foreground/50">
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" />
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" style={{ animationDelay: "0.2s" }} />
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-current" style={{ animationDelay: "0.4s" }} />
    </span>
  );
}
