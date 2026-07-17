import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ONBOARDING_CATEGORIES, useOnboarding } from "@/lib/bots";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useSettings } from "@/lib/askeasy";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Choose your vibe — AskEasy" },
      { name: "description", content: "Pick your favorite bot categories and language to personalize your AskEasy experience." },
    ],
  }),
  component: Onboarding,
});

type Step = 0 | 1;

function Onboarding() {
  const nav = useNavigate();
  const { state, update } = useOnboarding();
  const { settings, update: updateSettings } = useSettings();
  const [step, setStep] = useState<Step>(0);
  const [selected, setSelected] = useState<Set<string>>(new Set(state.categories));

  const canContinue = useMemo(() => selected.size >= 2, [selected]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleContinue = () => {
    if (step === 0) {
      if (!canContinue) return;
      update({ categories: Array.from(selected) });
      setStep(1);
      return;
    }
    // step 1 → complete
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
          onClick={() => (step === 0 ? nav({ to: "/splash" }) : setStep(0))}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
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
        <section className="px-6 pt-4">
          <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
            Choose your<br />bot's categories
          </h1>
          <p className="mt-2 text-sm opacity-60">
            To give you a personalized experience, let us choose categories.
          </p>

          {/* Scattered bubble pile */}
          <div className="relative mt-8 h-[360px]">
            {ONBOARDING_CATEGORIES.map((c, i) => {
              const active = selected.has(c.id);
              // Deterministic scatter positions
              const positions = [
                { top: "6%", left: "40%", rot: -6 },
                { top: "12%", left: "8%", rot: -14 },
                { top: "20%", left: "62%", rot: 12 },
                { top: "26%", left: "32%", rot: -4 },
                { top: "36%", left: "8%", rot: 8 },
                { top: "40%", left: "50%", rot: -10 },
                { top: "48%", left: "22%", rot: 16 },
                { top: "52%", left: "60%", rot: -6 },
                { top: "60%", left: "6%", rot: -12 },
                { top: "66%", left: "38%", rot: 6 },
                { top: "72%", left: "62%", rot: -8 },
                { top: "78%", left: "18%", rot: 10 },
              ];
              const p = positions[i % positions.length];
              const bg =
                active
                  ? "var(--butter)"
                  : c.tone === "lavender"
                    ? "var(--lavender)"
                    : "color-mix(in oklab, var(--cream) 90%, transparent)";
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="animate-tile-in absolute flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[13.5px] font-semibold shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] transition-all active:scale-95"
                  style={{
                    top: p.top,
                    left: p.left,
                    transform: `rotate(${p.rot}deg)`,
                    background: bg,
                    color: "var(--ink)",
                    animationDelay: `${i * 40}ms`,
                    outline: active ? "3px solid var(--ink)" : "none",
                    outlineOffset: active ? "-3px" : undefined,
                  }}
                >
                  <span aria-hidden>{c.emoji}</span>
                  {c.label}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-center text-xs opacity-50">
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
        </section>
      )}

      {/* Continue button */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        <button
          onClick={handleContinue}
          disabled={step === 0 && !canContinue}
          className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--butter)", color: "var(--ink)" }}
        >
          {step === 0 ? "Continue" : "Get started"}
        </button>
      </div>
    </main>
  );
}
