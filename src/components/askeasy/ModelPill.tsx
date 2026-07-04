import { useEffect, useRef, useState } from "react";
import { ChevronDown, Check, Sparkles, Zap, Leaf, Lock } from "lucide-react";
import { MODELS, FREE_LIMITS, type ModelId, type Usage } from "@/lib/askeasy";

const ICONS: Record<ModelId, React.ReactNode> = {
  "askeasy/smart": <Sparkles className="h-3.5 w-3.5" />,
  "askeasy/eco": <Leaf className="h-3.5 w-3.5" />,
  "askeasy/ultra": <Zap className="h-3.5 w-3.5" />,
};

type Props = {
  model: ModelId;
  isPro: boolean;
  usage: Usage;
  onSelect: (model: ModelId) => void;
  onRequestPro: () => void;
};

export function ModelPill({ model, isPro, usage, onSelect, onRequestPro }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = MODELS.find((m) => m.id === model) ?? MODELS[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const remaining = {
    text: Math.max(0, FREE_LIMITS.text - usage.text),
    media: Math.max(0, FREE_LIMITS.media - usage.media),
    voice: Math.max(0, FREE_LIMITS.voice - usage.voice),
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-foreground/85 transition hover:text-foreground"
        title="Change model"
      >
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full"
          style={{
            background:
              current.tier === "pro"
                ? "var(--send-gradient)"
                : "color-mix(in oklab, var(--foreground) 10%, transparent)",
            color: current.tier === "pro" ? "white" : undefined,
          }}
        >
          {ICONS[current.id]}
        </span>
        <span>{current.label}</span>
        {current.tier === "pro" && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
            style={{ background: "var(--send-gradient)" }}
          >
            Pro
          </span>
        )}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div
          className="glass animate-fade-up absolute left-1/2 top-full z-40 mt-2 w-72 -translate-x-1/2 rounded-2xl p-2 shadow-[0_20px_60px_-20px_oklch(0.2_0.05_280/0.45)]"
          style={{ animationDuration: "0.2s" }}
        >
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Choose model
          </div>
          {MODELS.map((m) => {
            const active = m.id === model;
            const locked = m.tier === "pro" && !isPro;
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (locked) {
                    onRequestPro();
                    setOpen(false);
                    return;
                  }
                  onSelect(m.id);
                  setOpen(false);
                }}
                className={
                  "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition " +
                  (active ? "bg-foreground/[0.06]" : "hover:bg-foreground/[0.04]")
                }
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background:
                      m.tier === "pro"
                        ? "var(--send-gradient)"
                        : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                    color: m.tier === "pro" ? "white" : undefined,
                  }}
                >
                  {ICONS[m.id]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-foreground">{m.label}</span>
                    {m.tier === "pro" ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                        style={{ background: "var(--send-gradient)" }}
                      >
                        Pro
                      </span>
                    ) : (
                      <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                        Free
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">{m.hint}</span>
                </span>
                {locked ? (
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                ) : active ? (
                  <Check className="h-4 w-4 text-foreground/70" />
                ) : null}
              </button>
            );
          })}

          {!isPro && (
            <div className="mt-1 rounded-xl bg-foreground/[0.04] p-2.5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Free plan · left today
              </div>
              <div className="flex items-center justify-between gap-2 text-[11px] text-foreground/80">
                <Meter label="Text" left={remaining.text} of={FREE_LIMITS.text} />
                <Meter label="Image/File" left={remaining.media} of={FREE_LIMITS.media} />
                <Meter label="Voice" left={remaining.voice} of={FREE_LIMITS.voice} />
              </div>
              <button
                onClick={() => {
                  onRequestPro();
                  setOpen(false);
                }}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full py-1.5 text-[12px] font-semibold text-white shadow-sm"
                style={{ background: "var(--send-gradient)" }}
              >
                <Zap className="h-3.5 w-3.5" />
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Meter({ label, left, of }: { label: string; left: number; of: number }) {
  const empty = left === 0;
  return (
    <div className="flex-1 rounded-lg bg-background/40 px-2 py-1.5 text-center">
      <div
        className={
          "text-[13px] font-semibold tabular-nums " + (empty ? "text-destructive" : "text-foreground")
        }
      >
        {left}
        <span className="text-muted-foreground">/{of}</span>
      </div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
