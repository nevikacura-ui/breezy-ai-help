import { useEffect, useState } from "react";

type Props = {
  phrases: string[];
  /** ms per character while typing */
  typeSpeed?: number;
  /** ms per character while deleting */
  deleteSpeed?: number;
  /** hold time after full phrase before deleting */
  holdMs?: number;
  className?: string;
};

export function Typewriter({
  phrases,
  typeSpeed = 55,
  deleteSpeed = 28,
  holdMs = 1400,
  className = "",
}: Props) {
  const [index, setIndex] = useState(0);
  const [sub, setSub] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[index % phrases.length];
    if (!deleting && sub === current) {
      const t = setTimeout(() => setDeleting(true), holdMs);
      return () => clearTimeout(t);
    }
    if (deleting && sub === "") {
      setDeleting(false);
      setIndex((i) => (i + 1) % phrases.length);
      return;
    }
    const t = setTimeout(
      () => {
        setSub((s) =>
          deleting ? current.slice(0, s.length - 1) : current.slice(0, s.length + 1),
        );
      },
      deleting ? deleteSpeed : typeSpeed,
    );
    return () => clearTimeout(t);
  }, [sub, deleting, index, phrases, typeSpeed, deleteSpeed, holdMs]);

  return (
    <span className={className} aria-live="polite">
      <span className="text-gradient">{sub}</span>
      <span
        className="animate-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] bg-current align-middle"
        aria-hidden
      />
    </span>
  );
}
