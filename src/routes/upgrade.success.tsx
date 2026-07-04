import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { getPaymentStatus } from "@/lib/pro.functions";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/upgrade/success")({
  validateSearch: z.object({ order: z.string().optional() }),
  component: SuccessPage,
});

function SuccessPage() {
  const { order } = useSearch({ from: "/upgrade/success" });
  const check = useServerFn(getPaymentStatus);
  const [status, setStatus] = useState<string>("PENDING");

  useEffect(() => {
    if (!order) return;
    let stop = false;
    let tries = 0;
    const tick = async () => {
      if (stop) return;
      tries++;
      try {
        const row = await check({ data: { orderId: order } });
        if (row?.status) setStatus(row.status);
        if (row?.status === "SUCCESS" || row?.status === "PAID") return;
      } catch { /* ignore */ }
      if (tries < 20) setTimeout(tick, 1500);
    };
    tick();
    return () => { stop = true; };
  }, [order, check]);

  const done = status === "SUCCESS" || status === "PAID";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white"
          style={{ background: "var(--send-gradient)" }}
        >
          {done ? <CheckCircle2 className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
          {done ? "You're on Pro" : "Confirming payment…"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {done
            ? "Ultra is unlocked and unlimited usage is active."
            : "Hang tight — we're syncing your payment with our servers."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-semibold text-white"
          style={{ background: "var(--send-gradient)" }}
        >
          <Sparkles className="h-4 w-4" />
          Back to AskEasy
        </Link>
        {order && <p className="mt-4 text-[10px] text-muted-foreground">Ref: {order}</p>}
      </div>
    </main>
  );
}
