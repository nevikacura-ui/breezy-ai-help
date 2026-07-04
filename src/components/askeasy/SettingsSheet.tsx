import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Zap, Check, Lock, Sparkles, Leaf, MessageSquare, ImageIcon, Mic } from "lucide-react";
import { MODELS, FREE_LIMITS, type ModelId, type Settings, type Theme, type Usage, useI18n } from "@/lib/askeasy";
import { LANGUAGES, type LangCode } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onClearConversation: () => void;
  onUpgrade: () => void;
  isProEffective: boolean;
  usage: Usage;
};

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
  { id: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
  { id: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
];

const MODEL_ICON: Record<ModelId, React.ReactNode> = {
  "askeasy/smart": <Sparkles className="h-3.5 w-3.5" />,
  "askeasy/eco": <Leaf className="h-3.5 w-3.5" />,
  "askeasy/ultra": <Zap className="h-3.5 w-3.5" />,
};

export function SettingsSheet({ open, onOpenChange, settings, update, onClearConversation, onUpgrade, isProEffective, usage }: Props) {
  const currentModel = settings.openRouterModel as ModelId;
  const t = useI18n(settings);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">{t("settings")}</SheetTitle>
          <SheetDescription>UI, model, language, and limits — all in one place.</SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          {/* Identity */}
          <section className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">Your name</Label>
            <Input
              id="name"
              placeholder="Friend"
              value={settings.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Used in your greeting.</p>
          </section>

          {/* India Mode */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">India</div>
            <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/60 p-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="text-base">🇮🇳</span>
                  {t("settings.india")}
                </div>
                <div className="text-xs text-muted-foreground">{t("settings.india.hint")}</div>
              </div>
              <Switch
                checked={settings.indiaMode}
                onCheckedChange={(v) =>
                  update({
                    indiaMode: v,
                    // Turning ON: default to Hindi if still English.
                    // Turning OFF: reset to English so the UI + AI leave India Mode fully.
                    language: v
                      ? (settings.language === "en" ? "hi" : settings.language)
                      : "en",
                    indiaOnboarded: true,
                  })
                }
              />
            </div>
            {settings.indiaMode && (
              <div className="space-y-2">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("settings.language")}</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {LANGUAGES.map((l) => {
                    const active = settings.language === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => update({ language: l.code as LangCode })}
                        className={
                          "rounded-xl border px-2 py-2 text-center text-[12px] leading-tight transition " +
                          (active
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/60 hover:bg-foreground/[0.03] text-foreground/80")
                        }
                      >
                        <div className="font-medium">{l.native}</div>
                        <div className="text-[10px] text-muted-foreground">{l.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* Model */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Model</div>
            <div className="space-y-1.5">
              {MODELS.map((m) => {
                const active = m.id === currentModel;
                const locked = m.tier === "pro" && !isProEffective;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      if (locked) { onUpgrade(); return; }
                      update({ openRouterModel: m.id });
                    }}
                    className={
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition " +
                      (active
                        ? "border-foreground/20 bg-foreground/[0.05]"
                        : "border-border/60 hover:bg-foreground/[0.03]")
                    }
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        background: m.tier === "pro" ? "var(--send-gradient)" : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                        color: m.tier === "pro" ? "white" : undefined,
                      }}
                    >
                      {MODEL_ICON[m.id]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-medium">{m.label}</span>
                        {m.tier === "pro" ? (
                          <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white" style={{ background: "var(--send-gradient)" }}>
                            Pro
                          </span>
                        ) : (
                          <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                            Free
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{m.hint}</span>
                    </span>
                    {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : active ? <Check className="h-4 w-4 text-foreground/70" /> : null}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Appearance — hidden when India Mode is on since it takes over the theme */}
          {!settings.indiaMode && (
            <section className="space-y-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Appearance</div>
              <div className="glass grid grid-cols-3 gap-1 rounded-full p-1">
                {THEMES.map((th) => {
                  const active = settings.theme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => update({ theme: th.id })}
                      className={
                        "flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium transition " +
                        (active ? "bg-foreground text-background shadow-sm" : "text-foreground/70 hover:text-foreground")
                      }
                    >
                      {th.icon}
                      {th.label}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Plan + Usage limits */}
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Plan &amp; usage</div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{
                    background: isProEffective ? "var(--send-gradient)" : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                    color: isProEffective ? "white" : "var(--foreground)",
                  }}
                >
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{isProEffective ? "Pro" : "Free"}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {isProEffective ? "Ultra model · unlimited usage" : "Daily free limits below"}
                  </div>
                </div>
              </div>
              {!isProEffective && (
                <Button size="sm" className="text-white" style={{ background: "var(--send-gradient)" }} onClick={onUpgrade}>
                  Upgrade
                </Button>
              )}
            </div>

            {!isProEffective && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <UsageTile icon={<MessageSquare className="h-3.5 w-3.5" />} label="Text" used={usage.text} of={FREE_LIMITS.text} />
                <UsageTile icon={<ImageIcon className="h-3.5 w-3.5" />} label="Image/File" used={usage.media} of={FREE_LIMITS.media} />
                <UsageTile icon={<Mic className="h-3.5 w-3.5" />} label="Voice" used={usage.voice} of={FREE_LIMITS.voice} />
              </div>
            )}
          </section>

          {/* Voice */}
          <section>
            <Row
              label="Voice input"
              hint="Long-press the ring to talk."
              checked={settings.voiceEnabled}
              onChange={(v) => update({ voiceEnabled: v })}
            />
          </section>

          <Button variant="outline" className="w-full" onClick={onClearConversation}>
            Clear conversation
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UsageTile({ icon, label, used, of }: { icon: React.ReactNode; label: string; used: number; of: number }) {
  const empty = used >= of;
  const remaining = Math.max(0, of - used);
  const pct = Math.min(100, (used / of) * 100);
  return (
    <div className={"rounded-xl border p-2 " + (empty ? "border-destructive/40 bg-destructive/5" : "border-border/60")}>
      <div className={"flex items-center gap-1.5 text-[11px] font-medium " + (empty ? "text-destructive" : "text-foreground/80")}>
        {icon}
        {label}
      </div>
      <div className={"mt-1 text-[13px] font-semibold tabular-nums " + (empty ? "text-destructive" : "text-foreground")}>
        {remaining}
        <span className="text-[10px] font-normal text-muted-foreground"> / {of}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-foreground/10">
        <div className={"h-full " + (empty ? "bg-destructive" : "bg-foreground/60")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
