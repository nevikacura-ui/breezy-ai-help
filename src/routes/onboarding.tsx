import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { ONBOARDING_CATEGORIES, useOnboarding } from "@/lib/bots";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Pick your categories — AskEasy" },
      { name: "description", content: "Choose 2-3 categories and AskEasy personalizes your agents instantly." },
      { property: "og:title", content: "Pick your categories — AskEasy" },
      { property: "og:description", content: "Choose 2-3 categories and AskEasy personalizes your agents instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const nav = useNavigate();
  const { state, update, hydrated } = useOnboarding();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    restoredRef.current = true;
    const draft = state.draftCategories?.length ? state.draftCategories : state.categories;
    setSelected(new Set(draft));
  }, [hydrated, state.draftCategories, state.categories]);

  useEffect(() => {
    if (!hydrated || !restoredRef.current) return;
    update({ step: 0, draftCategories: Array.from(selected) });
  }, [selected, hydrated, update]);

  const canContinue = selected.size >= 2;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleContinue = () => {
    if (!canContinue) return;
    update({ categories: Array.from(selected), completed: true, step: 0, draftCategories: [] });
    nav({ to: "/bots" });
  };

  return (
    <main
      className="relative min-h-dvh overflow-x-hidden pb-32"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => nav({ to: "/splash" })}
          aria-label="Back"
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="w-10" />
      </header>

      <section className="px-6 pt-4">
        <h1 className="font-display text-[1.7rem] leading-tight tracking-tight">
          Choose your<br />bot's categories
        </h1>
        <p className="mt-2 text-sm opacity-60">
          Pick 2–3 and we'll personalize your agents. You can change this anytime.
        </p>

        <div className="relative mt-6 h-[62vh] min-h-[380px] max-h-[520px]">
          {ONBOARDING_CATEGORIES.map((c, i) => {
            const active = selected.has(c.id);
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
                aria-pressed={active}
              >
                <span
                  className={`flex items-center justify-center rounded-full ${iconSize}`}
                  style={{ background: active ? "var(--butter)" : "rgba(255,255,255,0.7)" }}
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

      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: "var(--butter)", color: "var(--ink)" }}
        >
          Get started
        </button>
      </div>
    </main>
  );
}
