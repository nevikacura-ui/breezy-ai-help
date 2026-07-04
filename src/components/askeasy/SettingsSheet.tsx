import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Check, Sparkles, Zap, Leaf } from "lucide-react";
import type { Settings, Theme } from "@/lib/askeasy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onClearConversation: () => void;
};

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  { id: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
  { id: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
  { id: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
];

type ModelOpt = {
  id: string;
  label: string;
  hint: string;
  tier: "free" | "pro";
  icon: React.ReactNode;
};

const MODELS: ModelOpt[] = [
  { id: "askeasy/smart", label: "Smart", hint: "Balanced everyday answers", tier: "free", icon: <Sparkles className="h-4 w-4" /> },
  { id: "askeasy/ultra", label: "Ultra", hint: "Deep reasoning & long context", tier: "pro", icon: <Zap className="h-4 w-4" /> },
  { id: "askeasy/eco", label: "Eco", hint: "Fast & lightweight", tier: "free", icon: <Leaf className="h-4 w-4" /> },
];

export function SettingsSheet({ open, onOpenChange, settings, update, onClearConversation }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Settings</SheetTitle>
          <SheetDescription>UI, model, and mode — all in one place.</SheetDescription>
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

          {/* Appearance */}
          <section className="space-y-3">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Appearance</div>
            <div className="glass grid grid-cols-3 gap-1 rounded-full p-1">
              {THEMES.map((t) => {
                const active = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => update({ theme: t.id })}
                    className={
                      "flex items-center justify-center gap-1.5 rounded-full py-2 text-[12px] font-medium transition " +
                      (active
                        ? "bg-foreground text-background shadow-sm"
                        : "text-foreground/70 hover:text-foreground")
                    }
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mode / Model */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Mode</div>
              <div className="text-[10px] text-muted-foreground">Smart is default</div>
            </div>
            <div className="space-y-1.5">
              {MODELS.map((m) => {
                const active = settings.openRouterModel === m.id;
                const isPro = m.tier === "pro";
                return (
                  <button
                    key={m.id}
                    onClick={() => update({ openRouterModel: m.id })}
                    className={
                      "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition " +
                      (active
                        ? "border-foreground/20 bg-foreground/[0.06]"
                        : "border-border/60 hover:border-foreground/15 hover:bg-foreground/[0.03]")
                    }
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground"
                      style={{
                        background: isPro
                          ? "var(--send-gradient)"
                          : "color-mix(in oklab, var(--foreground) 8%, transparent)",
                        color: isPro ? "white" : undefined,
                      }}
                    >
                      {m.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-[14px] font-medium text-foreground">{m.label}</span>
                        {isPro && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white"
                            style={{ background: "var(--send-gradient)" }}
                          >
                            Pro
                          </span>
                        )}
                        {m.tier === "free" && (
                          <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                            Free
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] text-muted-foreground">{m.hint}</span>
                    </span>
                    {active && <Check className="h-4 w-4 shrink-0 text-foreground/70" />}
                  </button>
                );
              })}
            </div>
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

function Row({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
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
