import orbAsset from "@/assets/orb.mp4.asset.json";

type OrbProps = {
  size?: number;
  intense?: boolean;
  className?: string;
};

export function Orb({ size = 240, intense = false, className = "" }: OrbProps) {
  return (
    <div
      className={"relative select-none " + className}
      style={{ width: size, height: size }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.75 0.16 300 / 0.55), transparent 65%)",
          transform: intense ? "scale(1.3)" : "scale(1.1)",
          transition: "transform 400ms ease",
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
        className="h-full w-full object-cover drop-shadow-[0_20px_60px_rgba(120,80,255,0.35)]"
        style={{
          maskImage:
            "radial-gradient(circle at 50% 50%, black 55%, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 50%, black 55%, transparent 78%)",
        }}
      />
    </div>
  );
}
