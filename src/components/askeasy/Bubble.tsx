import { forwardRef } from "react";

type BubbleState = "idle" | "active" | "listening" | "thinking";

type BubbleProps = {
  size?: number;
  state?: BubbleState;
  className?: string;
  interactive?: boolean;
  ariaLabel?: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: boolean | "menu" | "dialog";
  ariaPressed?: boolean;
  onPointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerLeave?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
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
    state === "thinking" ? "2.4s" : state === "listening" ? "3s" : state === "active" ? "5s" : "9s";

  const scale = state === "active" ? 1.05 : state === "listening" ? 1.03 : 1;


  // Premium palette — molten gold / champagne, refined jewel tones
  const gradient =
    state === "listening"
      ? "conic-gradient(from 140deg, oklch(0.78 0.18 25), oklch(0.6 0.22 12), oklch(0.85 0.14 40), oklch(0.55 0.2 5), oklch(0.78 0.18 25))"
      : "conic-gradient(from 210deg, oklch(0.94 0.05 85), oklch(0.72 0.14 55), oklch(0.55 0.11 30), oklch(0.88 0.09 70), oklch(0.7 0.16 45), oklch(0.94 0.05 85))";

  const glowGradient =
    state === "listening"
      ? "conic-gradient(from 140deg, oklch(0.75 0.18 25), oklch(0.6 0.22 10), oklch(0.8 0.14 40), oklch(0.75 0.18 25))"
      : "conic-gradient(from 210deg, oklch(0.9 0.06 80), oklch(0.7 0.12 45), oklch(0.6 0.1 30), oklch(0.85 0.08 70), oklch(0.9 0.06 80))";

  const content = (
    <span
      className="relative inline-block"
      style={{
        width: size,
        height: size,
        transform: `scale(${scale})`,
        transition: "transform 260ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
      aria-hidden
    >
      {/* Soft outer halo */}
      <span
        className="absolute -inset-[2px] rounded-full blur-[4px]"
        style={{
          background: glowGradient,
          animation: `bubble-spin ${spin} linear infinite`,
          opacity: state === "idle" ? 0.3 : 0.5,
        }}
      />
      {/* Thin premium hollow ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          animation: `bubble-spin ${spin} linear infinite`,
          WebkitMask:
            "radial-gradient(circle, transparent 66%, black 68%, black 86%, transparent 88%)",
          mask: "radial-gradient(circle, transparent 66%, black 68%, black 86%, transparent 88%)",
          filter: "saturate(0.9) brightness(1.05)",
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
