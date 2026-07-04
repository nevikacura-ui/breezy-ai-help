type OrbProps = {
  size?: number;
  intense?: boolean;
  className?: string;
  /** Elevated state when the composer is focused or hovered. */
  active?: boolean;
  /** Extra energy when the user is typing / has input. */
  energized?: boolean;
};

/**
 * Large iridescent animated ring — pure CSS, no assets.
 * Mirrors the small Bubble button aesthetic, scaled up as the hero.
 */
export function Orb({
  size = 240,
  intense = false,
  className = "",
  active = false,
  energized = false,
}: OrbProps) {
  const scale = energized ? 1.06 : active ? 1.03 : 1;
  const glowScale = energized ? 1.55 : active ? 1.4 : intense ? 1.3 : 1.1;
  const glowOpacity = energized ? 0.9 : active ? 0.75 : 0.55;

  // Spin faster as the user engages
  const spin = energized ? "8s" : active ? "14s" : "24s";
  const counterSpin = energized ? "10s" : active ? "18s" : "30s";
  const pulse = energized ? "1.8s" : active ? "2.6s" : "4s";

  const ringGradient =
    "conic-gradient(from 0deg, oklch(0.78 0.2 30), oklch(0.72 0.22 300), oklch(0.78 0.2 200), oklch(0.82 0.2 90), oklch(0.78 0.2 30))";
  const innerGradient =
    "conic-gradient(from 180deg, oklch(0.82 0.18 280), oklch(0.78 0.2 320), oklch(0.85 0.15 200), oklch(0.82 0.18 280))";

  return (
    <div
      className={"relative select-none " + className}
      style={{
        width: size,
        height: size,
        transform: `scale(${scale})`,
        transition: "transform 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        willChange: "transform",
      }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
        style={{
          background: `radial-gradient(circle, oklch(0.75 0.16 300 / ${glowOpacity}), transparent 65%)`,
          transform: `scale(${glowScale})`,
          transition:
            "transform 900ms cubic-bezier(0.22, 1, 0.36, 1), background 600ms ease",
        }}
      />

      {/* Outer soft halo — spins slowly */}
      <div
        aria-hidden
        className="absolute inset-[-8%] rounded-full blur-2xl"
        style={{
          background: ringGradient,
          opacity: energized ? 0.7 : active ? 0.55 : 0.4,
          animation: `orb-spin ${spin} linear infinite`,
          transition: "opacity 600ms ease",
        }}
      />

      {/* Main iridescent ring */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background: ringGradient,
          animation: `orb-spin ${spin} linear infinite`,
          WebkitMask:
            "radial-gradient(circle, transparent 58%, black 60%, black 97%, transparent 100%)",
          mask: "radial-gradient(circle, transparent 58%, black 60%, black 97%, transparent 100%)",
          filter: energized
            ? "saturate(1.3) brightness(1.1)"
            : active
              ? "saturate(1.15) brightness(1.05)"
              : "none",
          transition: "filter 600ms ease",
        }}
      />

      {/* Counter-rotating thin accent ring */}
      <div
        aria-hidden
        className="absolute inset-[6%] rounded-full"
        style={{
          background: innerGradient,
          animation: `orb-spin-reverse ${counterSpin} linear infinite`,
          WebkitMask:
            "radial-gradient(circle, transparent 72%, black 74%, black 98%, transparent 100%)",
          mask: "radial-gradient(circle, transparent 72%, black 74%, black 98%, transparent 100%)",
          opacity: 0.7,
        }}
      />

      {/* Inner luminous core */}
      <div
        aria-hidden
        className="absolute inset-[20%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 32% 28%, oklch(1 0 0 / 0.85), oklch(0.85 0.14 300 / 0.35) 45%, transparent 75%)",
          animation: `orb-core-pulse ${pulse} ease-in-out infinite`,
        }}
      />

      {/* Specular highlight */}
      <div
        aria-hidden
        className="absolute inset-[28%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, oklch(1 0 0 / 0.7), transparent 55%)",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}
