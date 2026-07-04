import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor, Zap } from "lucide-react";
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

          {/* Plan */}
          <section className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Plan</div>
            <div
              className="flex items-center justify-between rounded-2xl border border-border/60 p-3"
              style={
                settings.isPro
                  ? { borderColor: "color-mix(in oklab, white 18%, transparent)" }
                  : undefined
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white"
                  style={{
                    background: settings.isPro
                      ? "var(--send-gradient)"
                      : "color-mix(in oklab, var(--foreground) 10%, transparent)",
                    color: settings.isPro ? "white" : "var(--foreground)",
                  }}
                >
                  <Zap className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {settings.isPro ? "Pro" : "Free"}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    {settings.isPro
                      ? "Ultra model · unlimited usage"
                      : "5 text · 2 image/file · 2 voice per session"}
                  </div>
                </div>
              </div>
              {settings.isPro ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ isPro: false, openRouterModel: "askeasy/smart" })}
                >
                  Downgrade
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="text-white"
                  style={{ background: "var(--send-gradient)" }}
                  onClick={() => update({ isPro: true, openRouterModel: "askeasy/ultra" })}
                >
                  Upgrade
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Change the active model any time from the pill in the top bar.
            </p>
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
