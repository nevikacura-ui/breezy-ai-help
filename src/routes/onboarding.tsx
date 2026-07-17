import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Volume2, Loader2, Square } from "lucide-react";
import { ONBOARDING_CATEGORIES, useOnboarding } from "@/lib/bots";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useSettings, PERSONAS, PERSONA_PRESETS, type Persona } from "@/lib/askeasy";

const VOICE_SAMPLES: Record<Persona, { text: string; instructions: string }> = {
  kid:   { text: "Hi there, superstar! I'm Easy — your friendly buddy. Ready to have some fun?", instructions: "Speak like a cheerful, gentle friend for a young child. Warm, playful, and clear. Smile through your voice." },
  teen:  { text: "Yo! I'm Easy — your quick-thinking sidekick. Let's make cool stuff together.", instructions: "Speak casually and upbeat, like a friendly older sibling. Confident, quick, and fun." },
  adult: { text: "Hello, I'm Easy — your everyday assistant. Ask me anything, the easy way.", instructions: "Speak warmly and naturally, like a calm, capable helper. Clear and friendly." },
  elder: { text: "Hello there. I'm Easy — your patient helper. Take your time; I'm right here.", instructions: "Speak slowly, warmly, and clearly, with gentle pacing and kind reassurance." },
};

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Choose your vibe — AskEasy" },
      { name: "description", content: "Tell us who you are, pick your favorite bot categories and language to personalize your AskEasy experience." },
    ],
  }),
  component: Onboarding,
});

type Step = 0 | 1 | 2;

function Onboarding() {
  const nav = useNavigate();
  const { state, update } = useOnboarding();
  const { settings, update: updateSettings } = useSettings();
  const [step, setStep] = useState<Step>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(state.categories));
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "playing" | "error">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
  }, []);

  const canContinue = useMemo(() => {
    if (step === 0) return true; // persona has a default
    if (step === 1) return selected.size >= 2;
    return true;
  }, [step, selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pickPersona = (id: Persona) => {
    const preset = PERSONA_PRESETS[id];
    updateSettings({
      persona: id,
      warmth: preset.warmth,
      textScale: preset.textScale,
      voiceRate: preset.voiceRate,
    });
  };

  const playSample = async (id: Persona) => {
    // If already playing, stop.
    if (audioRef.current && voiceState === "playing") {
      audioRef.current.pause();
      audioRef.current.src = "";
      setVoiceState("idle");
      return;
    }
    const sample = VOICE_SAMPLES[id];
    const rate = PERSONA_PRESETS[id].voiceRate;
    setVoiceState("loading");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sample.text, voiceRate: rate, instructions: sample.instructions }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "TTS failed"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setVoiceState("idle"); URL.revokeObjectURL(url); };
      audio.onerror = () => { setVoiceState("error"); URL.revokeObjectURL(url); };
      await audio.play();
      setVoiceState("playing");
      if ("vibrate" in navigator) navigator.vibrate?.(15);
    } catch {
      setVoiceState("error");
      setTimeout(() => setVoiceState("idle"), 1800);
    }
  };

  const handleContinue = () => {
    if (step === 0) { setStep(1); return; }
    if (step === 1) {
      if (!canContinue) return;
      update({ categories: Array.from(selected) });
      setStep(2);
      return;
    }
    update({ completed: true });
    nav({ to: "/bots" });
  };


  return (
    <main
      className="relative min-h-dvh overflow-hidden"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => (step === 0 ? nav({ to: "/splash" }) : setStep((step - 1) as Step))}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1 w-8 rounded-full transition-all"
              style={{
                background:
                  i <= step ? "var(--butter)" : "color-mix(in oklab, var(--cream) 15%, transparent)",
              }}
            />
          ))}
        </div>
        <span className="w-10" />
      </header>

      {step === 0 ? (
        <section className="px-6 pt-4 pb-40">
          <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
            Who's chatting<br />today?
          </h1>
          <p className="mt-2 text-sm opacity-60">
            One tap tunes tone, text size, and voice speed — you can change it later in Settings.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {PERSONAS.map((p) => {
              const active = settings.persona === p.id;
              const preset = PERSONA_PRESETS[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => pickPersona(p.id)}
                  className="flex flex-col items-start gap-2 rounded-3xl p-4 text-left transition-all active:scale-[0.98]"
                  style={{
                    background: active ? "var(--butter)" : "color-mix(in oklab, var(--cream) 8%, transparent)",
                    color: active ? "var(--ink)" : "var(--cream)",
                    border: active
                      ? "1px solid var(--ink)"
                      : "1px solid color-mix(in oklab, var(--cream) 12%, transparent)",
                    minHeight: 148,
                  }}
                  aria-pressed={active}
                >
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-2xl text-2xl"
                    style={{
                      background: active
                        ? "color-mix(in oklab, var(--ink) 10%, transparent)"
                        : "color-mix(in oklab, var(--cream) 10%, transparent)",
                    }}
                    aria-hidden
                  >
                    {p.emoji}
                  </span>
                  <div className="font-display text-[1.1rem] leading-none">{p.label}</div>
                  <div className="text-[12px] opacity-70">{p.hint}</div>
                  <div className="mt-auto flex gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-70">
                    <span className="rounded-full px-1.5 py-0.5" style={{ background: active ? "color-mix(in oklab, var(--ink) 10%, transparent)" : "color-mix(in oklab, var(--cream) 10%, transparent)" }}>
                      Aa {Math.round(preset.textScale * 100)}%
                    </span>
                    <span className="rounded-full px-1.5 py-0.5" style={{ background: active ? "color-mix(in oklab, var(--ink) 10%, transparent)" : "color-mix(in oklab, var(--cream) 10%, transparent)" }}>
                      {preset.voiceRate.toFixed(2)}× voice
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Try my voice */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              onClick={() => playSample(settings.persona)}
              disabled={voiceState === "loading"}
              className="flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "color-mix(in oklab, var(--butter) 18%, transparent)",
                color: "var(--butter)",
                border: "1px solid color-mix(in oklab, var(--butter) 30%, transparent)",
              }}
              aria-live="polite"
            >
              {voiceState === "loading" ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Warming up…</>
              ) : voiceState === "playing" ? (
                <><Square className="h-4 w-4 fill-current" /> Stop</>
              ) : voiceState === "error" ? (
                <><Volume2 className="h-4 w-4" /> Try again</>
              ) : (
                <><Volume2 className="h-4 w-4" /> Try my voice</>
              )}
            </button>
            <p className="text-[11px] opacity-50">
              Sample at {PERSONA_PRESETS[settings.persona].voiceRate.toFixed(2)}× · {PERSONAS.find(p => p.id === settings.persona)?.label} tone
            </p>
          </div>
        </section>
      ) : step === 1 ? (
        <section className="px-6 pt-4">
          <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
            Choose your<br />bot's categories
          </h1>
          <p className="mt-2 text-sm opacity-60">
            To give you a personalized experience, let us choose categories.
          </p>

          {/* Scattered bubble cloud — Dribbble style */}
          <div className="relative mt-8 h-[420px]">
            {ONBOARDING_CATEGORIES.map((c, i) => {
              const active = selected.has(c.id);
              // Deterministic scatter with varied sizes
              const positions = [
                { top: "2%",  left: "34%", rot: -6,  size: "lg" },
                { top: "8%",  left: "4%",  rot: -14, size: "md" },
                { top: "16%", left: "64%", rot: 10,  size: "md" },
                { top: "24%", left: "26%", rot: -3,  size: "sm" },
                { top: "32%", left: "56%", rot: -12, size: "lg" },
                { top: "38%", left: "4%",  rot: 8,   size: "md" },
                { top: "48%", left: "34%", rot: 4,   size: "md" },
                { top: "54%", left: "64%", rot: -8,  size: "sm" },
                { top: "62%", left: "6%",  rot: -6,  size: "lg" },
                { top: "72%", left: "38%", rot: 9,   size: "sm" },
                { top: "76%", left: "62%", rot: -10, size: "md" },
                { top: "84%", left: "14%", rot: 6,   size: "md" },
              ];
              const p = positions[i % positions.length];
              const toneMap: Record<string, string> = {
                butter:   "#ffd86b",
                lavender: "#d7c4ef",
                cream:    "#f6ecd6",
                pink:     "#ffc6d3",
                mint:     "#bde9c9",
                peach:    "#ffcfa8",
              };
              const bg = active ? "var(--ink)" : toneMap[c.tone];
              const fg = active ? "var(--butter)" : "var(--ink)";
              const sizeCls =
                p.size === "lg" ? "px-4 py-2.5 text-[15px]" :
                p.size === "md" ? "px-3.5 py-2 text-[13.5px]" :
                "px-3 py-1.5 text-[12.5px]";
              const iconSize =
                p.size === "lg" ? "h-7 w-7 text-[15px]" :
                p.size === "md" ? "h-6 w-6 text-[13px]" :
                "h-5 w-5 text-[11px]";
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className={`animate-tile-in absolute flex items-center gap-2 whitespace-nowrap rounded-full font-semibold shadow-[0_10px_28px_-10px_rgba(0,0,0,0.45)] transition-all active:scale-95 ${sizeCls}`}
                  style={{
                    top: p.top,
                    left: p.left,
                    transform: `rotate(${p.rot}deg)`,
                    background: bg,
                    color: fg,
                    animationDelay: `${i * 45}ms`,
                    border: active ? "2px solid var(--butter)" : "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span
                    className={`flex items-center justify-center rounded-full ${iconSize}`}
                    style={{
                      background: active ? "var(--butter)" : "rgba(255,255,255,0.7)",
                    }}
                    aria-hidden
                  >
                    {c.emoji}
                  </span>
                  {c.label}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-center text-xs opacity-50">
            {selected.size < 2 ? "Pick at least 2 to continue" : `${selected.size} selected`}
          </p>
        </section>
      ) : (
        <section className="px-6 pt-4 pb-40">
          <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
            Which language<br />do you prefer?
          </h1>
          <p className="mt-2 text-sm opacity-60">
            English is free. Other languages get a 3-day free trial, then Pro.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {LANGUAGES.map((l) => {
              const active = settings.language === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => updateSettings({ language: l.code as LangCode })}
                  className="flex items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left transition-all active:scale-[0.98]"
                  style={{
                    background: active
                      ? "var(--butter)"
                      : "color-mix(in oklab, var(--cream) 8%, transparent)",
                    color: active ? "var(--ink)" : "var(--cream)",
                    border: active
                      ? "1px solid var(--ink)"
                      : "1px solid color-mix(in oklab, var(--cream) 12%, transparent)",
                  }}
                >
                  <span className="text-lg leading-none">{l.flag}</span>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold">{l.native}</div>
                    <div className="truncate text-[11px] opacity-60">{l.label}</div>
                  </div>
                  {l.code !== "en" && (
                    <span
                      className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider"
                      style={{
                        background: active
                          ? "color-mix(in oklab, var(--ink) 10%, transparent)"
                          : "color-mix(in oklab, var(--butter) 30%, transparent)",
                        color: active ? "var(--ink)" : "var(--butter)",
                      }}
                    >
                      Trial
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Private Mode toggle */}
          <button
            onClick={() => updateSettings({ privateMode: !settings.privateMode })}
            className="mt-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            style={{
              background: settings.privateMode
                ? "color-mix(in oklab, var(--butter) 16%, transparent)"
                : "color-mix(in oklab, var(--cream) 8%, transparent)",
              border: settings.privateMode
                ? "1px solid color-mix(in oklab, var(--butter) 40%, transparent)"
                : "1px solid color-mix(in oklab, var(--cream) 12%, transparent)",
            }}
            aria-pressed={settings.privateMode}
          >
            <span className="text-xl leading-none" aria-hidden>🕶️</span>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">Private Mode</div>
              <div className="text-[11px] opacity-60">Don't save chats or memory on this device.</div>
            </div>
            <span
              className="relative h-6 w-11 rounded-full transition-colors"
              style={{
                background: settings.privateMode
                  ? "var(--butter)"
                  : "color-mix(in oklab, var(--cream) 20%, transparent)",
              }}
              aria-hidden
            >
              <span
                className="absolute top-0.5 h-5 w-5 rounded-full transition-all"
                style={{
                  left: settings.privateMode ? "22px" : "2px",
                  background: settings.privateMode ? "var(--ink)" : "var(--cream)",
                }}
              />
            </span>
          </button>
        </section>
      )}


      {/* Continue button */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--butter)", color: "var(--ink)" }}
        >
          {step === 2 ? "Get started" : "Continue"}
        </button>
      </div>
    </main>
  );
}
