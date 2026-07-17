import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOnboarding } from "@/lib/bots";
import mascot from "@/assets/bots/mascot.png";

export const Route = createFileRoute("/splash")({
  head: () => ({
    meta: [
      { title: "AskEasy — Personalized AI chatbots" },
      { name: "description", content: "Discover a world of personalized AI companions. Chat, learn, cook, code — every bot tuned for how you talk." },
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
          className="relative flex h-40 w-40 items-center justify-center rounded-[2.5rem]"
          style={{ background: "linear-gradient(135deg, var(--butter), #f7c948)" }}
        >
          <img
            src={mascot}
            alt="AskEasy mascot"
            className="animate-breathe h-36 w-36 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]"
            width={288}
            height={288}
          />
        </div>
        <h1 className="mt-8 font-display text-[2.6rem] leading-none tracking-tight">AskEasy</h1>
        <p className="mt-3 max-w-[18rem] text-center text-sm opacity-70">
          Your personal collection of AI companions.
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
