import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useOnboarding } from "@/lib/bots";
import logoAsset from "@/assets/askeasy-logo.png.asset.json";

export const Route = createFileRoute("/splash")({
  head: () => ({
    meta: [
      { title: "Askeasy — Meet Easy" },
      { name: "description", content: "Meet Easy, your cute AI companion. Ask anything, learn, create, and chat — the easy way." },
    ],
  }),
  component: Splash,
});

const BUBBLES: Array<{ top: string; left: string; size: number; color: string; delay: number; float: number }> = [
  { top: "12%", left: "8%",  size: 56, color: "#ffd84d", delay: 0.05, float: 4.5 },
  { top: "22%", left: "78%", size: 72, color: "#c4a8e0", delay: 0.15, float: 5.2 },
  { top: "68%", left: "12%", size: 88, color: "#f5b3c8", delay: 0.25, float: 6.0 },
  { top: "74%", left: "80%", size: 48, color: "#a8dcc6", delay: 0.35, float: 4.8 },
  { top: "42%", left: "4%",  size: 32, color: "#efe6d2", delay: 0.45, float: 5.5 },
  { top: "8%",  left: "50%", size: 24, color: "#ffd84d", delay: 0.55, float: 4.2 },
  { top: "88%", left: "45%", size: 36, color: "#c4a8e0", delay: 0.10, float: 5.8 },
];

function Splash() {
  const nav = useNavigate();
  const { state, update, hydrated } = useOnboarding();
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const leaveAt = window.setTimeout(() => setLeaving(true), 2400);
    const navAt = window.setTimeout(() => {
      update({ seenSplash: true });
      nav({ to: state.completed ? "/bots" : "/onboarding" });
    }, 2950);
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(navAt);
    };
  }, [hydrated, nav, state.completed, update]);

  return (
    <main
      className={`relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 ${leaving ? "animate-splash-out" : ""}`}
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Ambient warm glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 40% at 50% 42%, color-mix(in oklab, #c4a8e0 28%, transparent) 0%, transparent 70%), radial-gradient(40% 30% at 50% 80%, color-mix(in oklab, var(--butter) 18%, transparent) 0%, transparent 70%)",
        }}
      />

      {/* Floating background bubbles */}
      <div className="pointer-events-none absolute inset-0">
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="absolute animate-bubble-in"
            style={{
              top: b.top,
              left: b.left,
              width: b.size,
              height: b.size,
              animationDelay: `${b.delay}s`,
            }}
          >
            <span
              className="block h-full w-full rounded-full animate-float-bubble"
              style={{
                background: b.color,
                opacity: 0.85,
                boxShadow: `0 10px 30px -8px ${b.color}66`,
                animationDelay: `${b.delay + 0.6}s`,
                animationDuration: `${b.float}s`,
              }}
            />
          </span>
        ))}
      </div>

      {/* Hero */}
      <div className="relative flex flex-col items-center px-6">
        <div
          className="animate-logo-pop relative flex w-full max-w-md items-center justify-center"
          style={{ filter: "drop-shadow(0 30px 50px rgba(99, 78, 150, 0.45))" }}
        >
          <img
            src={logoAsset.url}
            alt="Askeasy"
            className="h-auto w-full object-contain"
            width={1200}
            height={400}
            loading="eager"
            decoding="async"
          />
        </div>

        <p
          className="animate-fade-up mt-2 max-w-[18rem] text-center text-sm opacity-70"
          style={{ animationDelay: "1.1s" }}
        >
          Meet Easy — your personal AI companion.
        </p>
      </div>

      {/* Loading dots */}
      <div
        className="animate-fade-in absolute bottom-10 flex items-center gap-1.5"
        style={{ animationDelay: "1.4s" }}
      >
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
