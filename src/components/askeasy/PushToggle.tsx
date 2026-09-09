import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { disablePush, enablePush, PUSH_MESSAGES } from "@/lib/push";
import { registerPushToken, sendPushToMe, unregisterPushToken } from "@/lib/push.functions";

const TOKEN_KEY = "askeasy.pushToken";

/** Lets the signed-in user turn browser notifications for reminders and replies on or off. */
export function PushToggle() {
  const register = useServerFn(registerPushToken);
  const unregister = useServerFn(unregisterPushToken);
  const sendTest = useServerFn(sendPushToMe);
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState(false);

  // Restore the saved state after a reload: only "on" when the browser still allows it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(TOKEN_KEY);
    const granted = "Notification" in window && Notification.permission === "granted";
    if (saved && granted) setOn(true);
    else if (saved) window.localStorage.removeItem(TOKEN_KEY);
  }, []);

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
      window.localStorage.setItem(TOKEN_KEY, result.token);
      setOn(true);
      toast.success("Notifications are on for this device.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn on notifications.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const token = window.localStorage.getItem(TOKEN_KEY);
      if (token) await unregister({ data: { token } });
      await disablePush();
      window.localStorage.removeItem(TOKEN_KEY);
      setOn(false);
      toast.success("Notifications are off for this device.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't turn off notifications.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await sendTest({
        data: { title: "AskEasy", body: "Notifications are working on this device.", path: "/bots" },
      });
      toast[res.sent > 0 ? "success" : "message"](
        res.sent > 0 ? "Test notification sent." : "No devices registered yet.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send a test notification.");
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
        <Button
          size="sm"
          variant={on ? "secondary" : "outline"}
          disabled={busy}
          onClick={on ? turnOff : turnOn}
        >
          {busy ? "…" : on ? "Turn off" : "Turn on"}
        </Button>
      </div>
    </section>
  );
}
