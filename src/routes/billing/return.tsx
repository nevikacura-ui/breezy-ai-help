import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { completePuvioBillingReturn } from "@/lib/puvio.functions";
import { ACCOUNT_REFRESH_EVENT } from "@/lib/account";
import { DivisionFooter } from "@/components/askeasy/DivisionFooter";

const searchSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  ref: z.string().optional(),
  ts: z.string().optional(),
  sig: z.string().optional(),
  signature: z.string().optional(),
});

type Result = { status: string; planCode: string; proUntil: string | null; ref: string };

export const Route = createFileRoute("/billing/return")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Puvio payment status — AskEasy Pro" },
      { name: "description", content: "Confirming your secure Puvio payment for AskEasy Pro." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Puvio payment status — AskEasy Pro" },
      { property: "og:description", content: "Confirming your secure Puvio payment for AskEasy Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BillingReturnPage,
});

function BillingReturnPage() {
  const search = useSearch({ from: "/billing/return" });
  const complete = useServerFn(completePuvioBillingReturn);
  const ran = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!search.id || !search.status || !search.ref || !search.ts || !(search.sig ?? search.signature)) {
      setError("This payment return link is incomplete. Open Settings to check your current plan before paying again.");
      return;
    }
    void complete({ data: {
      id: search.id,
      status: search.status,
      ref: search.ref,
      ts: search.ts,
      sig: search.sig,
      signature: search.signature,
    } }).then((value) => {
      setResult(value as Result);
      if (value.status === "paid") window.dispatchEvent(new Event(ACCOUNT_REFRESH_EVENT));
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "We could not confirm this payment. Check Settings before trying again.");
    });
  }, [complete, search]);

  const paid = result?.status === "paid";
  const pending = !result && !error;

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-md rounded-3xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: "var(--send-gradient)" }}>
          {pending ? <Loader2 className="h-6 w-6 animate-spin" /> : paid ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
        </div>
        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">
          {pending ? "Confirming your payment…" : paid ? "You're on Pro" : error ? "Payment needs attention" : "Payment not completed"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {pending
            ? "We’re verifying the signed Puvio return before unlocking your plan."
            : paid
              ? `Ultra and unlimited usage are active${result?.proUntil ? ` until ${new Date(result.proUntil).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}.`
              : error ?? "No Pro time was added. If money was debited, contact support with your payment reference."}
        </p>
        <Link to="/" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[14px] font-semibold text-white" style={{ background: "var(--send-gradient)" }}>
          <Sparkles className="h-4 w-4" /> Back to AskEasy
        </Link>
        {result?.ref && <p className="mt-4 break-all text-[10px] text-muted-foreground">Reference: {result.ref}</p>}
        <p className="mt-3 text-[11px] text-muted-foreground">Need help? <a className="underline underline-offset-2" href="mailto:info@nevika.ai">info@nevika.ai</a></p>
      </div>
      <DivisionFooter className="w-full max-w-lg" />
    </main>
  );
}
