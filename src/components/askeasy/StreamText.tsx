import { useEffect, useRef, useState, useMemo } from "react";

/**
 * Reveals text word-by-word with a soft rise + fade, and paints a subtle
 * shimmering rainbow gradient over the words as they arrive.
 *
 * Perf notes (targets 60fps on low-end devices):
 *  - rAF-driven with a time accumulator so we never queue more work than one
 *    frame; setInterval was firing renders faster than paint on slow devices.
 *  - Catch-up batching: multiple tokens per frame collapse into a single
 *    setState, keeping React commits bounded.
 *  - No `filter: blur()` on words — blur is the most expensive per-word GPU op.
 *    The rise + fade alone reads as premium and stays on the compositor.
 *  - `content-visibility: auto` on finished text lets the browser skip layout
 *    for offscreen chunks of long replies.
 */
export function StreamText({ text, speed = 28 }: { text: string; speed?: number }) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [count, setCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setCount(0);
    if (!tokens.length) return;

    let visible = 0;
    let last = performance.now();
    let acc = 0;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      acc += dt;
      if (acc >= speed) {
        const add = Math.min(tokens.length - visible, Math.floor(acc / speed));
        if (add > 0) {
          visible += add;
          acc -= add * speed;
          setCount(visible);
        }
      }
      if (visible < tokens.length) {
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [tokens, speed]);

  const done = count >= tokens.length;

  return (
    <span className={`stream-text ${done ? "is-done" : "is-streaming"}`}>
      {tokens.slice(0, count).map((tok, i) =>
        /\s+/.test(tok) ? (
          <span key={i}>{tok}</span>
        ) : (
          <span
            key={i}
            className="stream-word"
            style={{ animationDelay: `${Math.min(i * 10, 240)}ms` }}
          >
            {tok}
          </span>
        ),
      )}
      {!done && <span className="stream-caret" aria-hidden />}
    </span>
  );
}
