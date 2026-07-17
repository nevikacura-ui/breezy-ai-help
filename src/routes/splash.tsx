import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOnboarding } from "@/lib/bots";
import easy from "@/assets/bots/easy.png";

export const Route = createFileRoute("/splash")({
  head: () => ({
    meta: [
      { title: "Askeasy — Meet Easy" },
      { name: "description", content: "Meet Easy, your cute AI companion. Ask anything, learn, create, and chat — the easy way." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const nav = useNavigate();
  const { state, update, hydrated } = useOnboarding();

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      update({ seenSplash: true });
      nav({ to: state.completed ? "/bots" : "/onboarding" });
    }, 2200);
    return () => window.clearTimeout(t);
  }, [hydrated, nav, state.completed, update]);

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 40% at 50% 40%, color-mix(in oklab, var(--butter) 22%, transparent) 0%, transparent 70%)",
        }}
      />

      <div className="animate-fade-up relative flex flex-col items-center">
        <div
          className="relative flex h-44 w-44 items-center justify-center rounded-[2.5rem]"
          style={{ background: "linear-gradient(135deg, #c4a8e0, #9b7ed1)" }}
        >
          <img
            src={easy}
            alt="Easy, the cute Askeasy mascot"
            className="animate-breathe h-40 w-40 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]"
            width={320}
            height={320}
          />
        </div>
        <h1 className="mt-8 font-display text-[2.6rem] leading-none tracking-tight">Askeasy</h1>
        <p className="mt-3 max-w-[18rem] text-center text-sm opacity-70">
          Meet Easy — your personal AI companion.
        </p>
      </div>

      <div className="animate-fade-in absolute bottom-10 flex items-center gap-1.5" style={{ animationDelay: "0.8s" }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: "var(--cream)",
              opacity: 0.5,
              animation: `breathe 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </main>
  );
}
