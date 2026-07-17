import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, MoreHorizontal, RotateCcw, ThumbsUp, ThumbsDown, Send, Square } from "lucide-react";
import { getBotById, useCustomBots, useOnboarding, ONBOARDING_CATEGORIES, type Bot } from "@/lib/bots";
import { BotAvatar } from "@/components/askeasy/BotAvatar";
import { sendToAI, useSettings, type Message } from "@/lib/askeasy";
import { LANG_ENGLISH_NAME } from "@/lib/i18n";
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

function chatKey(botId: string) { return `askeasy.chat.${botId}.v1`; }

function BotChat() {
  const { botId } = Route.useParams();
  const nav = useNavigate();
  const { bots: customBots } = useCustomBots();
  const bot = getBotById(botId, customBots);
  const { settings } = useSettings();
  const { state: onboarding } = useOnboarding();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Human-readable category labels the user picked in onboarding
  const categoryLabels = useMemo(
    () =>
      onboarding.categories
        .map((id) => ONBOARDING_CATEGORIES.find((c) => c.id === id)?.label)
        .filter((x): x is string => !!x),
    [onboarding.categories],
  );

  const langName = LANG_ENGLISH_NAME[settings.language] ?? "English";

  // Build a system prompt augmented with onboarding context
  const systemPrompt = useMemo(() => {
    if (!bot) return "";
    const bits: string[] = [bot.systemPrompt];
    if (categoryLabels.length) {
      bits.push(
        `The user is especially interested in: ${categoryLabels.join(", ")}. Weave these interests into your replies when relevant.`,
      );
    }
    bits.push(`Reply in ${langName} unless the user explicitly asks otherwise.`);
    return bits.join("\n\n");
  }, [bot, categoryLabels, langName]);

  // Hydrate per-bot history + prefill first message
  useEffect(() => {
    if (!bot) return;
    try {
      const raw = window.localStorage.getItem(chatKey(bot.id));
      if (raw) {
        setMessages(JSON.parse(raw) as Message[]);
      } else {
        setMessages([{ id: "g", role: "assistant", content: bot.greeting, createdAt: Date.now() }]);
        // Prefill an opening question tailored to the user's interests
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
  }, [bot?.id]); // eslint-disable-line

  useEffect(() => {
    if (!bot || !hydrated) return;
    window.localStorage.setItem(chatKey(bot.id), JSON.stringify(messages));
  }, [messages, hydrated, bot?.id]); // eslint-disable-line

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = useCallback(async () => {
    if (!bot || !input.trim() || thinking) return;
    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: input.trim(), createdAt: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await sendToAI({
        messages: [...messages, userMsg],
        settings,
        system: systemPrompt,
        signal: controller.signal,
      });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply, createdAt: Date.now() }]);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try { navigator.vibrate([18, 40, 18]); } catch { /* noop */ }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Something went wrong. Try again.");
      }
    } finally {
      setThinking(false);
      abortRef.current = null;
    }
  }, [bot, input, thinking, messages, settings]);

  const stop = () => abortRef.current?.abort();

  const regenerate = async () => {
    if (!bot) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    // Remove last assistant if present
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") return prev.slice(0, -1);
      return prev;
    });
    setThinking(true);
    try {
      const reply = await sendToAI({
        messages: messages.filter((m) => m.role !== "assistant" || m !== messages[messages.length - 1]),
        settings,
        system: systemPrompt,
      });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: reply, createdAt: Date.now() }]);
    } catch {
      toast.error("Couldn't regenerate.");
    } finally {
      setThinking(false);
    }
  };

  if (!bot) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ background: "var(--ink)", color: "var(--cream)" }}>
        Bot not found. <Link to="/bots" className="ml-2 underline">Home</Link>
      </div>
    );
  }

  return (
    <main
      className="relative flex min-h-dvh flex-col overflow-hidden"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => nav({ to: "/bots" })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <div className="font-display text-[1.05rem]">{bot.name}</div>
        </div>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="More"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* Messages */}
      <section ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-40 pt-5">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          {messages.map((m) => (
            <MessageRow key={m.id} m={m} bot={bot} />
          ))}
          {thinking && (
            <div className="flex items-center gap-2 opacity-70">
              <BotAvatarSmall bot={bot} />
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
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Type your question…"
            className="flex-1 bg-transparent py-2.5 text-[14.5px] outline-none placeholder:opacity-40"
            style={{ color: "var(--cream)" }}
          />
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
    </main>
  );
}

function BotAvatarSmall({ bot }: { bot: Bot }) {
  return (
    <div
      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full"
      style={{
        background:
          bot.accent === "butter" ? "linear-gradient(135deg,#ffe58a,#ffc107)"
            : bot.accent === "lavender" ? "linear-gradient(135deg,#dfc4ee,#b487d3)"
              : bot.accent === "pink" ? "linear-gradient(135deg,#ffd6e0,#ff9ec4)"
                : bot.accent === "mint" ? "linear-gradient(135deg,#c6f0d5,#7ecfa1)"
                  : "linear-gradient(135deg,#fff6dd,#f2e2b4)",
      }}
    >
      {bot.avatar ? (
        <img src={bot.avatar} alt="" className="h-full w-full object-cover" width={32} height={32} loading="lazy" />
      ) : (
        <span className="text-[15px]">{bot.emoji ?? "🤖"}</span>
      )}
    </div>
  );
}

function MessageRow({ m, bot }: { m: Message; bot: Bot }) {
  const isUser = m.role === "user";
  if (isUser) {
    return (
      <div className="flex items-start justify-end gap-2">
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
      <BotAvatarSmall bot={bot} />
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
        <div className="mt-1.5 flex items-center gap-2 pl-1 opacity-60">
          <button aria-label="Like" className="hover:opacity-100"><ThumbsUp className="h-3.5 w-3.5" /></button>
          <button aria-label="Dislike" className="hover:opacity-100"><ThumbsDown className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
