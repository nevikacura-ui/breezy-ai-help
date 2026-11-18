import { trackLegalLinkClick } from "@/lib/analytics";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { createPuvioCheckout } from "@/lib/puvio.functions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Loader2, Zap } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason?: string;
  labels?: { title?: string; cta?: string; opening?: string };
};

export function UpgradeDialog({ open, onOpenChange, reason, labels }: Props) {
  const [busy, setBusy] = useState(false);
  const requestId = useRef<string | null>(null);
  const create = useServerFn(createPuvioCheckout);
  const navigate = useNavigate();

  const startCheckout = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        onOpenChange(false);
        navigate({ to: "/auth", search: { next: "/" } });
        return;
      }
      requestId.current ??= crypto.randomUUID();
      const checkout = await create({ data: { requestId: requestId.current } });
      window.location.assign(checkout.checkoutUrl);
    } catch (e) {
      requestId.current = null;
      toast.error("Couldn't start Puvio checkout", { description: String((e as Error).message ?? e) });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: "var(--send-gradient)" }}>
            <Zap className="h-5 w-5" />
          </div>
          <DialogTitle className="font-display text-center text-2xl">{labels?.title ?? "Upgrade to Pro"}</DialogTitle>
          <DialogDescription className="text-center">
            {reason ?? "Unlimited chat, media and voice — plus the Ultra model."}
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 space-y-2.5 text-[13.5px] text-foreground/85">
          <Row>Unlimited text, image/file, and voice messages</Row>
          <Row>Ultra model — deepest reasoning</Row>
          <Row>Priority speed &amp; longer memory</Row>
          <Row>30 days of Pro; renew when you choose</Row>
        </ul>

        <div className="mt-5 flex items-baseline justify-center gap-1">
          <span className="text-3xl font-semibold tracking-tight">₹499</span>
          <span className="text-sm text-muted-foreground">/ 30 days</span>
        </div>

        <button
          onClick={startCheckout}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white shadow-sm disabled:opacity-70"
          style={{ background: "var(--send-gradient)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {busy ? (labels?.opening ?? "Opening secure checkout…") : (labels?.cta ?? "Continue with Puvio")}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Secure Puvio checkout · Razorpay for INR · UPI, cards, netbanking, wallets
        </p>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
          ₹499 for 30 days · one-time payment · no automatic renewal ·{" "}
          <a className="underline underline-offset-2" href="/legal/terms" onClick={() => trackLegalLinkClick("terms", "checkout")}>Terms</a> ·{" "}
          <a className="underline underline-offset-2" href="/legal/refunds" onClick={() => trackLegalLinkClick("refunds", "checkout")}>Refunds</a> ·{" "}
          <a className="underline underline-offset-2" href="/legal/privacy" onClick={() => trackLegalLinkClick("privacy", "checkout")}>Privacy</a>
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white" style={{ background: "var(--send-gradient)" }}>
        <Check className="h-2.5 w-2.5" />
      </span>
      <span>{children}</span>
    </li>
  );
}
