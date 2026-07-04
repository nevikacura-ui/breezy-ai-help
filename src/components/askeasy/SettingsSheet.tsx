import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { Settings } from "@/lib/askeasy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  onClearConversation: () => void;
};

export function SettingsSheet({ open, onOpenChange, settings, update, onClearConversation }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Settings</SheetTitle>
          <SheetDescription>Make AskEasy feel like yours.</SheetDescription>
        </SheetHeader>

        <div className="mt-8 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input
              id="name"
              placeholder="Friend"
              value={settings.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Used in your greeting.</p>
          </div>

          <Row
            label="Dark mode"
            hint="Easier on the eyes at night."
            checked={settings.darkMode}
            onChange={(v) => update({ darkMode: v })}
          />
          <Row
            label="Smart Mode"
            hint="Pick the best model automatically."
            checked={settings.smartMode}
            onChange={(v) => update({ smartMode: v })}
          />
          <Row
            label="Voice input"
            hint="Tap the mic to speak."
            checked={settings.voiceEnabled}
            onChange={(v) => update({ voiceEnabled: v })}
          />

          <div className="space-y-2">
            <Label htmlFor="model">Default model</Label>
            <Input
              id="model"
              value={settings.openRouterModel}
              onChange={(e) => update({ openRouterModel: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Used when Smart Mode is off. Any OpenRouter model id.
            </p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-muted/40 p-4 text-xs text-muted-foreground">
            Add your OpenRouter API key on your backend and wire{" "}
            <code className="rounded bg-background/60 px-1 py-0.5">sendToAI()</code>{" "}
            in <code className="rounded bg-background/60 px-1 py-0.5">src/lib/askeasy.ts</code>.
          </div>

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
