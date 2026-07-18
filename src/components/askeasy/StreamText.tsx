import { useEffect, useState, useMemo } from "react";

/**
 * Reveals text word-by-word with a soft rise + fade, and paints a subtle
 * shimmering rainbow gradient over the words as they arrive.
 */
export function StreamText({ text, speed = 28 }: { text: string; speed?: number }) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    if (!tokens.length) return;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= tokens.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
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
            style={{ animationDelay: `${Math.min(i * 12, 400)}ms` }}
          >
            {tok}
          </span>
        ),
      )}
      {!done && <span className="stream-caret" aria-hidden />}
    </span>
  );
}
