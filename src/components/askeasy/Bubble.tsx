import { forwardRef } from "react";

type BubbleState = "idle" | "active" | "listening" | "thinking";

type BubbleProps = {
  size?: number;
  state?: BubbleState;
  className?: string;
  interactive?: boolean;
  ariaLabel?: string;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
};

/**
 * Iridescent animated ring/bubble. Pure CSS — no assets.
 * States:
 *  - idle     : slow shimmer
 *  - active   : menu open, brighter + slightly larger
 *  - listening: recording voice, warm red-tinted pulse
 *  - thinking : generating response, fast spin
 */
export const Bubble = forwardRef<HTMLButtonElement, BubbleProps>(function Bubble(
  {
    size = 26,
    state = "idle",
    className = "",
    interactive = false,
    ariaLabel,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onClick,
    onContextMenu,
    disabled,
  },
  ref,
) {
  const spin =
    state === "thinking" ? "1.4s" : state === "listening" ? "1.8s" : state === "active" ? "3s" : "6s";
  const pulse = state === "thinking" ? "1s" : state === "listening" ? "0.9s" : "3s";

  const scale = state === "active" ? 1.08 : state === "listening" ? 1.05 : 1;

  const gradient =
    state === "listening"
      ? "conic-gradient(from 0deg, oklch(0.7 0.24 25), oklch(0.75 0.22 15), oklch(0.68 0.26 5), oklch(0.72 0.24 35), oklch(0.7 0.24 25))"
      : "conic-gradient(from 0deg, oklch(0.78 0.19 60), oklch(0.72 0.22 30), oklch(0.65 0.24 350), oklch(0.7 0.2 290), oklch(0.75 0.16 220), oklch(0.78 0.19 60))";

  const glowGradient =
    state === "listening"
      ? "conic-gradient(from 0deg, oklch(0.7 0.24 25), oklch(0.75 0.22 15), oklch(0.68 0.26 5), oklch(0.72 0.24 35), oklch(0.7 0.24 25))"
      : "conic-gradient(from 0deg, oklch(0.75 0.17 55), oklch(0.7 0.2 30), oklch(0.65 0.22 350), oklch(0.7 0.18 290), oklch(0.72 0.15 220), oklch(0.75 0.17 55))";

  const content = (
    <span
      className="relative inline-block"
      style={{
        width: size,
        height: size,
        transform: `scale(${scale})`,
        transition: "transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      aria-hidden
    >
      {/* Outer glow */}
      <span
        className="absolute inset-0 rounded-full blur-md"
        style={{
          background: glowGradient,
          animation: `bubble-spin ${spin} linear infinite`,
          opacity: state === "idle" ? 0.55 : 0.95,
        }}
      />
      {/* Ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
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
            "radial-gradient(circle at 30% 25%, oklch(1 0 0 / 0.9), transparent 60%)",
          animation: `bubble-pulse ${pulse} ease-in-out infinite`,
        }}
      />
    </span>
  );

  if (!interactive) {
    return (
      <span
        className={"relative inline-block shrink-0 " + className}
        style={{ width: size, height: size }}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={
        "relative inline-flex shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50 " +
        className
      }
      style={{ width: size, height: size, touchAction: "none" }}
    >
      {content}
    </button>
  );
});
