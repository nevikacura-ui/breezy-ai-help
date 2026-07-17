import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sun, Moon, Monitor, Zap, Check, Lock, Sparkles, Leaf, MessageSquare, ImageIcon, Mic, Clock, Flame, X, Plus, Type, EyeOff } from "lucide-react";
import { useState } from "react";
import {
  MODELS, FREE_LIMITS, PERSONAS, type ModelId, type Settings, type Theme, type Usage, type Persona,
  trialDaysLeft, trialActive,
} from "@/lib/askeasy";
import { LANGUAGES, type LangCode } from "@/lib/i18n";


type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onClearConversation: () => void;
  onUpgrade: () => void;
  onSelectLanguage: (code: LangCode) => void;
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

export function SettingsSheet({
  open, onOpenChange, settings, update, onClearConversation, onUpgrade, onSelectLanguage, isProEffective, usage,
}: Props) {
  const currentModel = settings.openRouterModel as ModelId;
  const daysLeft = trialDaysLeft(settings);
  const inTrial = trialActive(settings);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Settings</SheetTitle>
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

          {/* Language */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Reply language</div>
              {settings.language !== "en" && !isProEffective && (
                <div className={"flex items-center gap-1 text-[11px] font-medium " + (inTrial ? "text-foreground/80" : "text-destructive")}>
                  <Clock className="h-3 w-3" />
                  {inTrial ? `Trial · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left` : "Trial ended"}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {LANGUAGES.map((l) => {
                const active = settings.language === l.code;
                const locked = l.code !== "en" && !isProEffective && !inTrial;
                return (
                  <button
                    key={l.code}
                    onClick={() => onSelectLanguage(l.code)}
                    className={
                      "flex items-center gap-2 rounded-2xl border px-3 py-2.5 text-left text-[13px] transition " +
                      (active
                        ? "border-foreground bg-foreground/[0.06] text-foreground"
                        : "border-border/60 text-foreground/85 hover:bg-foreground/[0.04]")
                    }
                  >
                    <span className="text-base leading-none">{l.flag}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.native}</span>
                      <span className="block truncate text-[10.5px] text-muted-foreground">{l.label}</span>
                    </span>
                    {active ? <Check className="h-3.5 w-3.5 text-foreground" />
                      : locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              English is free. Other languages include a 3-day free trial, then Pro.
            </p>
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
                    onClick={() => { if (locked) { onUpgrade(); return; } update({ openRouterModel: m.id }); }}
                    className={
                      "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition " +
                      (active ? "border-foreground/30 bg-foreground/[0.05]" : "border-border/60 hover:bg-foreground/[0.03]")
                    }
                  >
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        background: m.tier === "pro" ? "var(--send-gradient)" : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                        color: "var(--foreground)",
                      }}
                    >
                      {MODEL_ICON[m.id]}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[13.5px] font-medium">{m.label}</span>
                        {m.tier === "pro" ? (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                            style={{ background: "var(--send-gradient)", color: "var(--primary-foreground)" }}
                          >
                            Pro
                          </span>
                        ) : (
                          <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
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

          {/* Appearance */}
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

          {/* Plan + Usage */}
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Plan &amp; usage</div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    background: isProEffective ? "var(--send-gradient)" : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                    color: "var(--foreground)",
                  }}
                >
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">{isProEffective ? "Pro" : "Free"}</div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {isProEffective ? "Ultra model · unlimited · all languages" : "5 text · 2 media · 2 voice per day"}
                  </div>
                </div>
              </div>
              {!isProEffective && (
                <Button
                  size="sm"
                  className="font-semibold text-[color:var(--primary-foreground)]"
                  style={{ background: "var(--send-gradient)" }}
                  onClick={onUpgrade}
                >
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
        {icon}{label}
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
