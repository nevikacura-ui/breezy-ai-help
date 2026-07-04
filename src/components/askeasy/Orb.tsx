import orbAsset from "@/assets/orb.mp4.asset.json";

type OrbProps = {
  size?: number;
  intense?: boolean;
  className?: string;
  /** Elevated state when the composer is focused or hovered. */
  active?: boolean;
  /** Extra energy when the user is typing / has input. */
  energized?: boolean;
};

export function Orb({
  size = 240,
  intense = false,
  className = "",
  active = false,
  energized = false,
}: OrbProps) {
  const scale = energized ? 1.06 : active ? 1.03 : 1;
  const glowScale = energized ? 1.55 : active ? 1.4 : intense ? 1.3 : 1.1;
  const glowOpacity = energized ? 0.85 : active ? 0.72 : 0.55;

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
      <video
        src={orbAsset.url}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="orb-video h-full w-full object-cover drop-shadow-[0_20px_60px_rgba(120,80,255,0.35)]"
        style={{
          maskImage:
            "radial-gradient(circle at 50% 50%, black 45%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 45%, transparent 70%)",
          filter: energized
            ? "saturate(1.25) brightness(1.08)"
            : active
              ? "saturate(1.1) brightness(1.03)"
              : "none",
          transition: "filter 600ms ease",
        }}
      />
    </div>
  );
}
