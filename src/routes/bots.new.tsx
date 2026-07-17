import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCustomBots, type Bot } from "@/lib/bots";

export const Route = createFileRoute("/bots/new")({
  head: () => ({
    meta: [
      { title: "Create your own bot — Askeasy" },
      { name: "description", content: "Create a custom AI chatbot with its own personality, goals, and tone." },
    ],
  }),
  component: NewBot,
});

const EMOJIS = ["🤖", "✨", "🎯", "🌈", "🐣", "🎨", "🧙", "🚀", "☕", "🌸", "🐉", "🧠"];
const ACCENTS = ["butter", "lavender", "pink", "mint", "cream"] as const;

const TONE_PRESETS = [
  "Warm and casual",
  "Playful and witty",
  "Calm and thoughtful",
  "Direct and no-fluff",
  "Encouraging coach",
  "Professional expert",
];

type Starter = { title: string; hint: string; emoji: string };
type Step = "basics" | "personalize" | "preview";

const DEFAULT_STARTERS: Starter[] = [
  { title: "Ask me anything", hint: "I'm here to help.", emoji: "💬" },
  { title: "Be specific", hint: "The more context the better.", emoji: "🎯" },
  { title: "Tell me your goal", hint: "I'll shape my answers around it.", emoji: "🚀" },
];

function accentBg(accent: (typeof ACCENTS)[number]) {
  return accent === "butter" ? "linear-gradient(135deg,#ffe58a,#ffc107)"
    : accent === "lavender" ? "linear-gradient(135deg,#dfc4ee,#b487d3)"
    : accent === "pink" ? "linear-gradient(135deg,#ffd6e0,#ff9ec4)"
    : accent === "mint" ? "linear-gradient(135deg,#c6f0d5,#7ecfa1)"
    : "linear-gradient(135deg,#fff6dd,#f2e2b4)";
}

function NewBot() {
  const nav = useNavigate();
  const { addBot } = useCustomBots();

  const [step, setStep] = useState<Step>("basics");

  // Basics
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [emoji, setEmoji] = useState("🤖");
  const [accent, setAccent] = useState<(typeof ACCENTS)[number]>("lavender");

  // Personalize
  const [goals, setGoals] = useState("");
  const [tone, setTone] = useState("Warm and casual");

  // Generated
  const [tagline, setTagline] = useState("");
  const [greeting, setGreeting] = useState("");
  const [starters, setStarters] = useState<Starter[]>(DEFAULT_STARTERS);
  const [generating, setGenerating] = useState(false);

  const canBasics = name.trim().length >= 2 && role.trim().length >= 5;
  const canPersonalize = goals.trim().length >= 5 && tone.trim().length >= 2;

  const generate = async () => {
    if (!canPersonalize) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/bot-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role: role.trim(), goals: goals.trim(), tone: tone.trim() }),
      });
      const data = await res.json() as { tagline?: string; greeting?: string; starters?: Starter[] };
      if (data.tagline) setTagline(data.tagline);
      if (data.greeting) setGreeting(data.greeting);
      if (data.starters?.length) setStarters(data.starters);
      setStep("preview");
    } catch {
      toast.error("Couldn't generate — using defaults");
      setStep("preview");
    } finally {
      setGenerating(false);
    }
  };

  const save = () => {
    if (!canBasics) return;
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
      systemPrompt: `You are ${name.trim()}. ${role.trim()} User goals: ${goals.trim() || "(none)"}. Voice: ${tone}. Keep responses concise and helpful, in line with these goals and voice.`,
      greeting: greeting.trim() || `Hi! I'm ${name.trim()}. How can I help?`,
      instructions: starters.map((s) => ({
        title: s.title.trim() || "Ask me anything",
        hint: s.hint.trim() || "I'm here to help.",
        emoji: s.emoji.trim() || "💬",
      })),
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
          onClick={() => {
            if (step === "basics") nav({ to: "/bots" });
            else if (step === "personalize") setStep("basics");
            else setStep("personalize");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-[1.05rem]">
          {step === "basics" ? "Create a bot" : step === "personalize" ? "Personalize" : "Preview"}
        </span>
        <span className="w-10" />
      </header>

      {/* Stepper */}
      <div className="mx-5 mt-4 flex gap-2">
        {(["basics", "personalize", "preview"] as Step[]).map((s, i) => {
          const idx = ["basics", "personalize", "preview"].indexOf(step);
          const done = i <= idx;
          return (
            <div key={s} className="h-1 flex-1 rounded-full"
              style={{ background: done ? "var(--butter)" : "color-mix(in oklab, var(--cream) 12%, transparent)" }} />
          );
        })}
      </div>

      <section className="px-5 pt-6">
        {/* Preview card (shown on all steps) */}
        <div className="mb-6 flex items-center gap-3 rounded-3xl p-4"
          style={{ background: "color-mix(in oklab, var(--cream) 6%, transparent)" }}>
          <div className="flex h-16 w-16 items-center justify-center rounded-full text-[30px]"
            style={{ background: accentBg(accent) }}>
            {emoji}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-[1.15rem]">{name || "Your bot"}</div>
            <div className="truncate text-[12px] opacity-60">{tagline || "Custom bot"}</div>
          </div>
        </div>

        {step === "basics" && (
          <>
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Study Buddy"
                className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-40" />
            </Field>
            <Field label="What should it help with?">
              <textarea value={role} onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Explain physics concepts with simple analogies."
                rows={3}
                className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:opacity-40" />
            </Field>

            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider opacity-60">Icon</div>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[18px] transition-all"
                    style={{ background: emoji === e ? "var(--butter)" : "color-mix(in oklab, var(--cream) 8%, transparent)" }}>
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wider opacity-60">Accent</div>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button key={a} onClick={() => setAccent(a)}
                    className="h-8 w-8 rounded-full transition-all"
                    style={{
                      background: accentBg(a),
                      outline: accent === a ? "2px solid var(--butter)" : "none",
                      outlineOffset: accent === a ? "3px" : undefined,
                    }}
                    aria-label={a} />
                ))}
              </div>
            </div>
          </>
        )}

        {step === "personalize" && (
          <>
            <div className="mb-4 rounded-2xl p-4"
              style={{ background: "color-mix(in oklab, var(--butter) 10%, transparent)", border: "1px solid color-mix(in oklab, var(--butter) 30%, transparent)" }}>
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4" style={{ color: "var(--butter)" }} />
                <div className="text-[13px] opacity-80">
                  Tell your bot what you want out of it. It'll craft a personal greeting and starter prompts around your goals.
                </div>
              </div>
            </div>

            <Field label="Your goals">
              <textarea value={goals} onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Help me revise for my exam, quiz me daily, and explain hard chapters with analogies."
                rows={4}
                className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:opacity-40" />
            </Field>

            <Field label="Tone / voice">
              <input value={tone} onChange={(e) => setTone(e.target.value)}
                placeholder="Warm and casual"
                className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-40" />
            </Field>

            <div className="mt-1 mb-4 flex flex-wrap gap-2">
              {TONE_PRESETS.map((t) => (
                <button key={t} onClick={() => setTone(t)}
                  className="rounded-full px-3 py-1.5 text-[12px] transition-all"
                  style={{
                    background: tone === t ? "var(--butter)" : "color-mix(in oklab, var(--cream) 8%, transparent)",
                    color: tone === t ? "var(--ink)" : "var(--cream)",
                  }}>
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <Field label="Tagline">
              <input value={tagline} onChange={(e) => setTagline(e.target.value)}
                placeholder="Short one-liner"
                className="w-full bg-transparent text-[15px] outline-none placeholder:opacity-40" />
            </Field>

            <Field label="Greeting">
              <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                className="w-full resize-none bg-transparent text-[15px] outline-none placeholder:opacity-40" />
            </Field>

            <div className="mb-2 mt-4 flex items-center justify-between">
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-60">Starter prompts</div>
              <button onClick={generate} disabled={generating}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-[12px] transition-all disabled:opacity-40"
                style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}>
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Regenerate
              </button>
            </div>

            <div className="space-y-3">
              {starters.map((s, i) => (
                <div key={i} className="rounded-2xl p-3"
                  style={{
                    background: "color-mix(in oklab, var(--cream) 6%, transparent)",
                    border: "1px solid color-mix(in oklab, var(--cream) 12%, transparent)",
                  }}>
                  <div className="flex items-center gap-2">
                    <input value={s.emoji}
                      onChange={(e) => updateStarter(i, { emoji: e.target.value }, setStarters)}
                      className="w-10 rounded-lg bg-transparent text-center text-[18px] outline-none"
                      maxLength={4} />
                    <input value={s.title}
                      onChange={(e) => updateStarter(i, { title: e.target.value }, setStarters)}
                      placeholder="Title"
                      className="flex-1 bg-transparent text-[14px] font-medium outline-none placeholder:opacity-40" />
                  </div>
                  <input value={s.hint}
                    onChange={(e) => updateStarter(i, { hint: e.target.value }, setStarters)}
                    placeholder="Short hint"
                    className="mt-1 w-full bg-transparent text-[12px] opacity-70 outline-none placeholder:opacity-40" />
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        {step === "basics" && (
          <button onClick={() => setStep("personalize")} disabled={!canBasics}
            className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--butter)", color: "var(--ink)" }}>
            Next: Personalize
          </button>
        )}
        {step === "personalize" && (
          <button onClick={generate} disabled={!canPersonalize || generating}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98] disabled:opacity-40"
            style={{ background: "var(--butter)", color: "var(--ink)" }}>
            {generating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            {generating ? "Generating…" : "Generate persona"}
          </button>
        )}
        {step === "preview" && (
          <button onClick={save}
            className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98]"
            style={{ background: "var(--butter)", color: "var(--ink)" }}>
            Create bot
          </button>
        )}
      </div>
    </main>
  );
}

function updateStarter(i: number, patch: Partial<Starter>, setStarters: React.Dispatch<React.SetStateAction<Starter[]>>) {
  setStarters((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
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
