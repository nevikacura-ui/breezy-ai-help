import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Loader2, Send, Star } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthUser } from "@/lib/askeasy";
import { submitCustomerFeedback } from "@/lib/account.functions";

const KINDS = [
  { id: "feedback", label: "Feedback" },
  { id: "bug", label: "Bug report" },
  { id: "feature", label: "Feature idea" },
  { id: "support", label: "Support" },
] as const;

export function SupportModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const user = useAuthUser();
  const submit = useServerFn(submitCustomerFeedback);
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setContactEmail(user?.email ?? "");
  }, [open, user?.email]);

  const send = async () => {
    setBusy(true);
    try {
      const result = await submit({ data: { kind, subject, message, rating, contactEmail } });
      toast.success("Thanks — your message is saved", {
        description: result.emailSent ? "Our support team has been notified." : "We’ll review it from the support inbox.",
      });
      setSubject("");
      setMessage("");
      setRating(null);
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't send your message", { description: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center">Feedback &amp; support</DialogTitle>
          <DialogDescription className="text-center">Tell us what worked, what broke, or what you need next.</DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-muted-foreground">Sign in so we can save your request and reply to the right account.</p>
            <Button asChild className="w-full"><Link to="/auth">Sign in to continue</Link></Button>
            <a href="mailto:info@nevika.ai" className="block text-xs text-muted-foreground underline underline-offset-2">Or email info@nevika.ai</a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setKind(item.id)}
                  className={"rounded-xl border px-3 py-2 text-sm font-medium " + (kind === item.id ? "border-foreground bg-accent" : "border-border/60 hover:bg-accent/60")}
                  aria-pressed={kind === item.id}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={160} placeholder="How can we help?" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-message">Message</Label>
              <Textarea id="support-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} rows={5} placeholder="Include steps or details that will help us understand." />
              <p className="text-right text-[10px] text-muted-foreground">{message.length}/5000</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Optional rating</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button key={value} type="button" onClick={() => setRating(rating === value ? null : value)} aria-label={`Rate ${value} out of 5`} className="p-1">
                    <Star className={"h-4 w-4 " + (rating !== null && value <= rating ? "fill-secondary text-secondary" : "text-muted-foreground")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="support-email">Reply email</Label>
              <Input id="support-email" type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="you@example.com" />
            </div>
            <Button className="w-full" disabled={busy || subject.trim().length < 2 || message.trim().length < 5} onClick={send}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy ? "Saving…" : "Send to AskEasy"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Support is also available at <a className="underline underline-offset-2" href="mailto:info@nevika.ai">info@nevika.ai</a>.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
