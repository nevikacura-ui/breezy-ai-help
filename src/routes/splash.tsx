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
    links: [
      // Preconnect + high-priority preload so the logo is decoded before first paint
      { rel: "preload", as: "image", href: logoAsset.url, type: "image/png", fetchpriority: "high" },
    ],
  }),
  component: Splash,
});

function Splash() {
  const nav = useNavigate();
  const { state, update, hydrated } = useOnboarding();
  const [leaving, setLeaving] = useState(false);
  const [logoReady, setLogoReady] = useState(false);

  // Decode the logo bitmap before we let it paint — kills first-frame flicker.
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.decoding = "async";
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "high";
    img.src = logoAsset.url;
    const done = () => { if (!cancelled) setLogoReady(true); };
    img.decode?.().then(done).catch(done) ?? done();
    // Safety net if decode() never resolves
    const fallback = window.setTimeout(done, 400);
    return () => { cancelled = true; window.clearTimeout(fallback); };
  }, []);

  useEffect(() => {
    if (!hydrated || !logoReady) return;
    const leaveAt = window.setTimeout(() => setLeaving(true), 2400);
    const navAt = window.setTimeout(() => {
      update({ seenSplash: true });
      nav({ to: state.completed ? "/bots" : "/onboarding" });
    }, 2950);
    return () => {
      window.clearTimeout(leaveAt);
      window.clearTimeout(navAt);
    };
  }, [hydrated, logoReady, nav, state.completed, update]);

  return (
    <main
      className={`relative flex min-h-dvh flex-col overflow-hidden px-6 ${leaving ? "animate-splash-out" : ""}`}
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Ambient wash — pushed slightly above optical center */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(42% 34% at 50% 46%, color-mix(in oklab, #c4a8e0 30%, transparent) 0%, transparent 72%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[46%] h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 rounded-full animate-logo-halo"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--butter) 28%, transparent) 0%, transparent 66%)",
        }}
      />

      {/* Hero stack — anchored to optical center (~46% vh) */}
      <div
        className="relative z-10 flex flex-1 flex-col items-center justify-center"
        style={{ paddingBottom: "8vh", opacity: logoReady ? 1 : 0, transition: "opacity 180ms ease-out" }}
      >
        <div className="animate-logo-reveal relative overflow-hidden [transform-origin:center]">
          <img
            src={logoAsset.url}
            alt="Askeasy"
            className="animate-logo-settle block h-auto w-[72vw] max-w-[380px] object-contain [transform-origin:center]"
            width={1200}
            height={400}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            draggable={false}
            style={{ contain: "layout paint" }}
          />
          {/* Single premium light sweep */}
          <span
            aria-hidden
            className="animate-logo-sheen pointer-events-none absolute inset-y-0 left-0 w-1/3"
            style={{
              background:
                "linear-gradient(100deg, transparent 0%, color-mix(in oklab, var(--cream) 60%, transparent) 48%, color-mix(in oklab, var(--butter) 45%, transparent) 56%, transparent 100%)",
              mixBlendMode: "screen",
              filter: "blur(6px)",
            }}
          />
        </div>

        <p
          className="animate-fade-up mt-7 text-center text-[11px] font-medium uppercase opacity-55"
          style={{ animationDelay: "1.05s", letterSpacing: "0.28em" }}
        >
          Ask anything · The easy way
        </p>
      </div>

      {/* Minimal loader */}
      <div
        className="animate-fade-in absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-1.5"
        style={{ animationDelay: "1.4s" }}
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
