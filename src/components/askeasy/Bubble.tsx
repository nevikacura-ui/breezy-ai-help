type BubbleProps = {
  size?: number;
  state?: "idle" | "listening" | "thinking";
  className?: string;
};

/**
 * Iridescent animated ring/bubble. Pure CSS — no assets.
 * State drives animation intensity so users get instant feedback
 * when a response is being generated.
 */
export function Bubble({ size = 26, state = "idle", className = "" }: BubbleProps) {
  const spin =
    state === "thinking" ? "1.6s" : state === "listening" ? "2.4s" : "6s";
  const pulse = state === "thinking" ? "1.1s" : "3s";

  return (
    <span
      className={"relative inline-block shrink-0 " + className}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer glow */}
      <span
        className="absolute inset-0 rounded-full blur-md"
        style={{
          background:
            "conic-gradient(from 0deg, oklch(0.75 0.18 30), oklch(0.7 0.2 300), oklch(0.75 0.18 200), oklch(0.8 0.18 90), oklch(0.75 0.18 30))",
          animation: `bubble-spin ${spin} linear infinite`,
          opacity: state === "idle" ? 0.55 : 0.9,
        }}
      />
      {/* Ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, oklch(0.78 0.2 30), oklch(0.72 0.22 300), oklch(0.78 0.2 200), oklch(0.82 0.2 90), oklch(0.78 0.2 30))",
          animation: `bubble-spin ${spin} linear infinite`,
          WebkitMask:
            "radial-gradient(circle, transparent 46%, black 48%, black 96%, transparent 100%)",
          mask: "radial-gradient(circle, transparent 46%, black 48%, black 96%, transparent 100%)",
        }}
      />
      {/* Inner highlight */}
      <span
        className="absolute inset-[22%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 25%, oklch(1 0 0 / 0.85), transparent 60%)",
          animation: `bubble-pulse ${pulse} ease-in-out infinite`,
        }}
      />
    </span>
  );
}
