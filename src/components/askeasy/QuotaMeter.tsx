import { MessageSquare, ImageIcon, Mic, Zap } from "lucide-react";
import { FREE_LIMITS, type Usage } from "@/lib/askeasy";

type Props = {
  usage: Usage;
  isPro: boolean;
  onUpgrade: () => void;
};

export function QuotaMeter({ usage, isPro, onUpgrade }: Props) {
  if (isPro) return null;
  const rows = [
    { key: "text" as const, icon: MessageSquare, label: "Text", used: usage.text, of: FREE_LIMITS.text },
    { key: "media" as const, icon: ImageIcon, label: "Image/File", used: usage.media, of: FREE_LIMITS.media },
    { key: "voice" as const, icon: Mic, label: "Voice", used: usage.voice, of: FREE_LIMITS.voice },
  ];
  const anyExhausted = rows.some((r) => r.used >= r.of);
  return (
    <div className="mx-auto mt-2 flex max-w-2xl items-center gap-1.5 px-1">
      {rows.map((r) => {
        const empty = r.used >= r.of;
        const pct = Math.min(100, (r.used / r.of) * 100);
        return (
          <div
            key={r.key}
            className={
              "flex flex-1 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition " +
              (empty
                ? "border-destructive/40 bg-destructive/8 text-destructive"
                : "border-border/50 bg-background/40 text-foreground/70")
            }
            title={`${r.label}: ${r.used}/${r.of} used today`}
          >
            <r.icon className="h-3 w-3 shrink-0" />
            <span className="hidden truncate xs:inline">{r.label}</span>
            <span className="tabular-nums">{Math.max(0, r.of - r.used)}</span>
            <span className="relative ml-auto h-1 w-6 overflow-hidden rounded-full bg-foreground/10">
              <span
                className={"absolute inset-y-0 left-0 " + (empty ? "bg-destructive" : "bg-foreground/60")}
                style={{ width: `${pct}%` }}
              />
            </span>
          </div>
        );
      })}
      <button
        onClick={onUpgrade}
        className={
          "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold text-white transition " +
          (anyExhausted ? "animate-pulse" : "")
        }
        style={{ background: "var(--send-gradient)" }}
        title="Upgrade to Pro"
      >
        <Zap className="h-3 w-3" />
        Pro
      </button>
    </div>
  );
}
