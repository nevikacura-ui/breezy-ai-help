import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Settings2, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { needsAnswer, onConsentChange, readChoice, saveChoices, type Choice } from "@/lib/consent";

export const COOKIE_SETTINGS_EVENT = "askeasy:cookie-settings";

export function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [gpc, setGpc] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    setGpc(nav.globalPrivacyControl === true);
    setChoice(readChoice("analytics"));
    void needsAnswer(["analytics"]).then(setOpen);
    const openSettings = () => {
      setChoice(readChoice("analytics"));
      setDetails(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_SETTINGS_EVENT, openSettings);
    const unsubscribe = onConsentChange(() => setChoice(readChoice("analytics")));
    return () => {
      window.removeEventListener(COOKIE_SETTINGS_EVENT, openSettings);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => panelRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const save = (value: Choice) => {
    saveChoices({ analytics: value });
    setChoice(value);
    setOpen(false);
    setDetails(false);
  };

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="region"
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-xl rounded-3xl border border-border bg-card p-5 text-card-foreground shadow-2xl outline-none sm:bottom-5 sm:p-6"
    >
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Close cookie preferences without saving"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="pr-8">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4" /> Your privacy, your choice
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          We count visits without cookies. If you accept, we also measure clicks. Necessary browser storage keeps you signed in and remembers your settings.
        </p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Read our <Link to="/legal/cookies" className="underline underline-offset-2">Cookie Policy</Link> and <Link to="/legal/privacy" className="underline underline-offset-2">Privacy Policy</Link>.
        </p>
      </div>

      {details && (
        <div className="mt-4 space-y-2 rounded-2xl border border-border/60 p-3">
          <div className="flex items-center justify-between gap-4 py-1">
            <div>
              <div className="text-sm font-medium">Necessary</div>
              <div className="text-xs text-muted-foreground">Sign-in, security, preferences, and your saved consent choice.</div>
            </div>
            <span className="text-xs font-medium text-muted-foreground">Always on</span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-3">
            <div>
              <div className="text-sm font-medium">Analytics, provided by Lovable</div>
              <div className="text-xs text-muted-foreground">Privacy-friendly visit measurement and, with permission, clicks.</div>
            </div>
            <Switch
              checked={choice === "granted"}
              disabled={gpc}
              onCheckedChange={(checked) => setChoice(checked ? "granted" : "denied")}
              aria-label="Allow analytics"
            />
          </div>
          {gpc && <p className="text-xs text-muted-foreground">Your browser's Global Privacy Control signal applies, so analytics choices are off and disabled.</p>}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => save("denied")} className="w-full">Reject all</Button>
        <Button onClick={() => save("granted")} className="w-full">Accept all</Button>
      </div>
      {details ? (
        <Button
          variant="secondary"
          className="mt-2 w-full"
          disabled={gpc}
          onClick={() => save(choice ?? "denied")}
        >
          <Check className="h-4 w-4" /> Save choices
        </Button>
      ) : (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setDetails(true)}>
          <Settings2 className="h-4 w-4" /> Cookie settings
        </Button>
      )}
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Closing or ignoring this panel grants nothing.</p>
    </div>
  );
}
