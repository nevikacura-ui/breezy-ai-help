import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useServerFn } from "@tanstack/react-start";
import { createCashfreeOrder } from "@/lib/pro.functions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check, Loader2, Zap } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reason?: string;
};

const CASHFREE_SDK = "https://sdk.cashfree.com/js/v3/cashfree.js";

function loadCashfree(): Promise<((opts: { mode: "sandbox" | "production" }) => { checkout: (o: { paymentSessionId: string; redirectTarget?: string }) => Promise<unknown> })> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { Cashfree?: unknown };
    if (w.Cashfree) return resolve(w.Cashfree as never);
    const s = document.createElement("script");
    s.src = CASHFREE_SDK;
    s.onload = () => {
      const cf = (window as unknown as { Cashfree?: unknown }).Cashfree;
      cf ? resolve(cf as never) : reject(new Error("Cashfree SDK not available"));
    };
    s.onerror = () => reject(new Error("Cashfree SDK failed to load"));
    document.head.appendChild(s);
  });
}

export function UpgradeDialog({ open, onOpenChange, reason }: Props) {
  const [busy, setBusy] = useState(false);
  const create = useServerFn(createCashfreeOrder);
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
      const order = await create();
      const Cashfree = await loadCashfree();
      const cf = Cashfree({ mode: order.env === "production" ? "production" : "sandbox" });
      await cf.checkout({ paymentSessionId: order.paymentSessionId, redirectTarget: "_self" });
    } catch (e) {
      toast.error("Couldn't start checkout", { description: String((e as Error).message ?? e) });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-white"
            style={{ background: "var(--send-gradient)" }}
          >
            <Zap className="h-5 w-5" />
          </div>
          <DialogTitle className="font-display text-center text-2xl">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-center">
            {reason ?? "Unlimited chat, media and voice — plus the Ultra model."}
          </DialogDescription>
        </DialogHeader>

        <ul className="mt-2 space-y-2.5 text-[13.5px] text-foreground/85">
          <Row>Unlimited text, image/file, and voice messages</Row>
          <Row>Ultra model — deepest reasoning</Row>
          <Row>Priority speed &amp; longer memory</Row>
          <Row>Cancel anytime</Row>
        </ul>

        <div className="mt-5 flex items-baseline justify-center gap-1">
          <span className="text-3xl font-semibold tracking-tight">₹499</span>
          <span className="text-sm text-muted-foreground">/ month</span>
        </div>

        <button
          onClick={startCheckout}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white shadow-sm disabled:opacity-70"
          style={{ background: "var(--send-gradient)" }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {busy ? "Opening secure checkout…" : "Continue to Cashfree"}
        </button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Secure payments by Cashfree · UPI, cards, netbanking, wallets
        </p>
      </DialogContent>
    </Dialog>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: "var(--send-gradient)" }}
      >
        <Check className="h-2.5 w-2.5" />
      </span>
      <span>{children}</span>
    </li>
  );
}
