import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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

const WORDMARK = "askeasy";

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
      <div className="relative flex flex-col items-center">
        <div className="relative flex h-52 w-52 items-center justify-center">
          {/* Rotating soft ring */}
          <div
            className="absolute inset-0 rounded-full animate-ring-sweep"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, color-mix(in oklab, var(--butter) 55%, transparent) 90deg, transparent 180deg, color-mix(in oklab, #c4a8e0 55%, transparent) 270deg, transparent 360deg)",
              WebkitMask: "radial-gradient(circle, transparent 62%, #000 63%, #000 100%)",
              mask: "radial-gradient(circle, transparent 62%, #000 63%, #000 100%)",
              filter: "blur(2px)",
            }}
          />
          <div
            className="relative flex h-44 w-44 items-center justify-center rounded-[2.5rem] animate-mascot-pop"
            style={{
              background: "linear-gradient(135deg, #c4a8e0, #9b7ed1)",
              boxShadow: "0 30px 60px -20px rgba(155, 126, 209, 0.55)",
            }}
          >
            <img
              src={easy}
              alt="Easy, the cute Askeasy mascot"
              className="animate-breathe h-40 w-40 object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.35)]"
              width={320}
              height={320}
              style={{ animationDelay: "1.1s" }}
            />
          </div>
        </div>

        {/* Wordmark — letter-by-letter rise */}
        <h1 className="mt-9 flex font-display text-[2.8rem] leading-none tracking-tight">
          {WORDMARK.split("").map((ch, i) => (
            <span
              key={i}
              className="animate-letter-rise inline-block"
              style={{ animationDelay: `${0.7 + i * 0.06}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <p
          className="animate-fade-up mt-3 max-w-[18rem] text-center text-sm opacity-70"
          style={{ animationDelay: "1.25s" }}
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
