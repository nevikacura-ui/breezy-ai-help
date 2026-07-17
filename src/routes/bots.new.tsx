import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCustomBots, type Bot } from "@/lib/bots";

export const Route = createFileRoute("/bots/new")({
  head: () => ({
    meta: [
      { title: "Create your own bot — Chation" },
      { name: "description", content: "Create a custom AI chatbot with its own personality, role, and tone." },
    ],
  }),
  component: NewBot,
});

const EMOJIS = ["🤖", "✨", "🎯", "🌈", "🐣", "🎨", "🧙", "🚀", "☕", "🌸", "🐉", "🧠"];
const ACCENTS = ["butter", "lavender", "pink", "mint", "cream"] as const;

function NewBot() {
  const nav = useNavigate();
  const { addBot } = useCustomBots();
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState("Warm and casual");
  const [emoji, setEmoji] = useState("🤖");
  const [accent, setAccent] = useState<typeof ACCENTS[number]>("lavender");

  const canSave = name.trim().length >= 2 && role.trim().length >= 5;

  const save = () => {
    if (!canSave) return;
    const bot: Bot = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim() || "Custom bot",
      category: "friend",
      rating: 5.0,
      price: "Free",
      tier: "free",
      emoji,
      accent,
      systemPrompt: `You are ${name.trim()}. ${role.trim()} Voice: ${tone}. Keep responses concise and helpful.`,
      greeting: `Hi! I'm ${name.trim()}. How can I help?`,
      instructions: [
        { title: "Ask me anything", hint: "I'm here to help.", emoji: "💬" },
        { title: "Be specific", hint: "The more context the better.", emoji: "🎯" },
        { title: "Tell me your goal", hint: "I'll shape my answers around it.", emoji: "🚀" },
      ],
      custom: true,
    };
    addBot(bot);
    toast.success(`${bot.name} created`);
    nav({ to: "/bots/$botId", params: { botId: bot.id } });
  };

  return (
    <main
      className="relative min-h-dvh pb-32"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => nav({ to: "/bots" })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-[1.05rem]">Create a bot</span>
        <span className="w-10" />
      </header>

      <section className="px-5 pt-6">
        {/* Preview */}
        <div className="mb-6 flex items-center gap-3 rounded-3xl p-4"
          style={{ background: "color-mix(in oklab, var(--cream) 6%, transparent)" }}>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full text-[30px]"
            style={{
              background:
                accent === "butter" ? "linear-gradient(135deg,#ffe58a,#ffc107)"
                  : accent === "lavender" ? "linear-gradient(135deg,#dfc4ee,#b487d3)"
                    : accent === "pink" ? "linear-gradient(135deg,#ffd6e0,#ff9ec4)"
                      : accent === "mint" ? "linear-gradient(135deg,#c6f0d5,#7ecfa1)"
                        : "linear-gradient(135deg,#fff6dd,#f2e2b4)",
            }}
          >
            {emoji}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-[1.15rem]">{name || "Your bot"}</div>
            <div className="truncate text-[12px] opacity-60">{tagline || "Custom bot"}</div>
          </div>
        </div>

        {/* Fields */}
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Study Buddy"
            className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-40"
          />
        </Field>

        <Field label="Tagline">
          <input
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Short one-liner"
            className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-40"
          />
        </Field>

        <Field label="What should it help with?">
          <textarea
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Explain physics concepts with simple analogies."
            rows={3}
            className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:opacity-40"
          />
        </Field>

        <Field label="Voice">
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Warm and casual"
            className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-40"
          />
        </Field>

        {/* Emoji picker */}
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider opacity-60">Icon</div>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[18px] transition-all"
                style={{
                  background: emoji === e ? "var(--butter)" : "color-mix(in oklab, var(--cream) 8%, transparent)",
                }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Accent picker */}
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider opacity-60">Accent</div>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                onClick={() => setAccent(a)}
                className="h-8 w-8 rounded-full ring-offset-2 transition-all"
                style={{
                  background:
                    a === "butter" ? "linear-gradient(135deg,#ffe58a,#ffc107)"
                      : a === "lavender" ? "linear-gradient(135deg,#dfc4ee,#b487d3)"
                        : a === "pink" ? "linear-gradient(135deg,#ffd6e0,#ff9ec4)"
                          : a === "mint" ? "linear-gradient(135deg,#c6f0d5,#7ecfa1)"
                            : "linear-gradient(135deg,#fff6dd,#f2e2b4)",
                  outline: accent === a ? "2px solid var(--butter)" : "none",
                  outlineOffset: accent === a ? "3px" : undefined,
                }}
                aria-label={a}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        <button
          onClick={save}
          disabled={!canSave}
          className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--butter)", color: "var(--ink)" }}
        >
          Create bot
        </button>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block rounded-2xl px-4 py-3"
      style={{
        background: "color-mix(in oklab, var(--cream) 6%, transparent)",
        border: "1px solid color-mix(in oklab, var(--cream) 12%, transparent)",
      }}>
      <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-wider opacity-60">{label}</span>
      {children}
    </label>
  );
}
