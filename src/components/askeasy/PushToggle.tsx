import { useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { enablePush, PUSH_MESSAGES } from "@/lib/push";
import { registerPushToken } from "@/lib/push.functions";

/** Lets the signed-in user turn on browser notifications for reminders and replies. */
export function PushToggle() {
  const register = useServerFn(registerPushToken);
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(false);

  const turnOn = async () => {
    setBusy(true);
    try {
      const result = await enablePush();
      if (result.status !== "registered") {
        toast.message(PUSH_MESSAGES[result.status]);
        return;
      }
      await register({
        data: { token: result.token, platform: "web", userAgent: navigator.userAgent.slice(0, 500) },
      });
      setOn(true);
      toast.success("Notifications are on for this device.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">Notifications</div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm">
            <Bell className="h-4 w-4" /> Push notifications
          </div>
          <p className="text-[12px] text-muted-foreground">Reminders and replies, even when AskEasy is closed.</p>
        </div>
        <Button size="sm" variant={on ? "secondary" : "outline"} disabled={busy || on} onClick={turnOn}>
          {on ? "On" : busy ? "…" : "Turn on"}
        </Button>
      </div>
    </section>
  );
}
