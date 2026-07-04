import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Camera, Plus, Sparkles, Moon, Sun } from "lucide-react";
import orbImage from "@/assets/orb.png";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const [value, setValue] = useState("");
  const [isDark, setIsDark] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [isDark]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [value]);

  const hasText = value.trim().length > 0;

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(circle, oklch(0.85 0.09 290 / 0.5), transparent 70%)",
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-foreground/70 animate-pulse-soft" />
          <span className="text-[13px] font-medium tracking-tight text-foreground/80">
            AskEasy
          </span>
        </div>
        <button
          onClick={() => setIsDark((d) => !d)}
          aria-label="Toggle theme"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 transition hover:text-foreground"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="relative animate-fade-up" style={{ animationDelay: "0.05s" }}>
          <div
            aria-hidden
            className="absolute inset-0 -z-10 blur-3xl opacity-70"
            style={{
              background:
                "radial-gradient(circle, oklch(0.8 0.12 300 / 0.55), transparent 65%)",
            }}
          />
          <img
            src={orbImage}
            alt=""
            width={280}
            height={280}
            className="h-56 w-56 select-none animate-orb-float drop-shadow-2xl sm:h-64 sm:w-64"
            draggable={false}
          />
        </div>

        <h1
          className="font-display mt-10 text-[2.15rem] leading-[1.05] tracking-tight text-foreground animate-fade-up sm:text-5xl"
          style={{ animationDelay: "0.15s" }}
        >
          Hey there,
          <br />
          <span className="italic text-foreground/90">what can I help with?</span>
        </h1>

        <p
          className="mt-4 max-w-xs text-[13px] leading-relaxed text-muted-foreground animate-fade-up"
          style={{ animationDelay: "0.25s" }}
        >
          Ask anything. Speak it, snap it, or type it — Smart Mode picks the right AI for you.
        </p>
      </section>

      {/* Composer */}
      <div
        className="relative z-10 px-4 pb-6 pt-4 animate-fade-up"
        style={{ animationDelay: "0.35s" }}
      >
        <div className="mx-auto max-w-xl">
          <div className="glass rounded-[28px] p-3 shadow-[0_20px_60px_-20px_oklch(0.2_0.05_280/0.25)]">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Ask anything…"
              rows={1}
              className="w-full resize-none bg-transparent px-3 pt-2 text-[16px] leading-6 text-foreground placeholder:text-muted-foreground/80 focus:outline-none"
            />

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <IconChip label="Attach">
                  <Plus className="h-[18px] w-[18px]" />
                </IconChip>
                <IconChip label="Camera">
                  <Camera className="h-[18px] w-[18px]" />
                </IconChip>
                <SmartChip />
              </div>

              <div className="flex items-center gap-2">
                {!hasText && (
                  <IconChip label="Voice" primary>
                    <Mic className="h-[18px] w-[18px]" />
                  </IconChip>
                )}
                <button
                  aria-label="Send"
                  disabled={!hasText}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg transition-all duration-300 disabled:opacity-40"
                  style={{ background: "var(--send-gradient)" }}
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground/70">
            AskEasy can make mistakes. Verify important info.
          </p>
        </div>
      </div>
    </main>
  );
}

function IconChip({
  children,
  label,
  primary = false,
}: {
  children: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className={
        "flex h-10 w-10 items-center justify-center rounded-full transition " +
        (primary
          ? "bg-foreground text-background hover:opacity-90"
          : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function SmartChip() {
  return (
    <div className="ml-1 flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 text-[12px] font-medium text-foreground/70">
      <Sparkles className="h-3.5 w-3.5" />
      Smart
    </div>
  );
}
