import { useEffect, useRef, useState } from "react";

/**
 * ChatGPT/Grok-style smooth character reveal.
 * - Character-by-character append (no per-word transforms, no shimmer).
 * - rAF-driven with time accumulator, batches multiple chars per frame.
 * - Plain white text; a soft caret blinks while streaming.
 */
export function StreamText({ text, speed = 12 }: { text: string; speed?: number }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef(text);

  useEffect(() => {
    targetRef.current = text;
  }, [text]);

  useEffect(() => {
    let last = performance.now();
    let acc = 0;

    const step = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      setCount((c) => {
        const target = targetRef.current.length;
        if (c >= target) {
          acc = 0;
          return c;
        }
        const add = Math.max(1, Math.floor(acc / speed));
        acc -= add * speed;
        return Math.min(target, c + add);
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [speed]);

  const done = count >= text.length;

  return (
    <span className={`stream-text ${done ? "is-done" : "is-streaming"}`}>
      {text.slice(0, count)}
      {!done && <span className="stream-caret" aria-hidden />}
    </span>
  );
}
