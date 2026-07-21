import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useOnboarding } from "@/lib/bots";
import logoAsset from "@/assets/askeasy-logo-transparent.png.asset.json";

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
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const leaveAt = window.setTimeout(() => setLeaving(true), 2000);
    const navAt = window.setTimeout(() => {
      update({ seenSplash: true });
      nav({ to: state.completed ? "/bots" : "/onboarding" });
    }, 2550);
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
      {/* Soft ambient glow behind the logo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(45% 35% at 50% 50%, color-mix(in oklab, #c4a8e0 32%, transparent) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-logo-halo"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--butter) 26%, transparent) 0%, transparent 65%)",
        }}
      />

      {/* Logo — the hero */}
      <div className="relative flex flex-col items-center">
        <div className="animate-logo-reveal relative overflow-hidden">
          <img
            src={logoAsset.url}
            alt="Askeasy"
            className="animate-logo-breathe h-auto w-[78vw] max-w-sm object-contain [transform-origin:center]"
            width={1200}
            height={400}
            loading="eager"
            decoding="async"
          />
          {/* Premium light sweep */}
          <span
            aria-hidden
            className="animate-logo-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{
              background:
                "linear-gradient(100deg, transparent 0%, color-mix(in oklab, var(--cream) 55%, transparent) 45%, color-mix(in oklab, var(--butter) 40%, transparent) 55%, transparent 100%)",
              mixBlendMode: "screen",
              filter: "blur(6px)",
            }}
          />
        </div>

        <p
          className="animate-fade-up mt-6 text-center text-sm tracking-wide opacity-60"
          style={{ animationDelay: "0.9s", letterSpacing: "0.14em" }}
        >
          ASK ANYTHING · THE EASY WAY
        </p>
      </div>

      {/* Minimal loader */}
      <div
        className="animate-fade-in absolute bottom-12 flex items-center gap-1.5"
        style={{ animationDelay: "1.2s" }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1 w-1 rounded-full"
            style={{
              background: "var(--cream)",
              opacity: 0.4,
              animation: `breathe 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </main>
  );
}
