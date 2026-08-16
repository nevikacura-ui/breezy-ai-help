import { useState } from "react";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import type { PendingApproval } from "@/lib/askeasy";

/**
 * Nothing external happens without a tap here.
 * What I found · What I propose · What I'll do · Approve / Cancel.
 */
export function ApprovalCard({
  proposal,
  onApprove,
  onCancel,
}: {
  proposal: PendingApproval;
  onApprove: (p: PendingApproval) => Promise<void>;
  onCancel: (p: PendingApproval) => void;
}) {
  const [busy, setBusy] = useState(false);

  const detail = Object.entries(proposal.input)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .slice(0, 4);

  return (
    <div
      className="rounded-2xl border px-4 py-3.5 animate-fade-in"
      style={{
        borderColor: "color-mix(in oklab, var(--foreground) 16%, transparent)",
        background: "color-mix(in oklab, var(--foreground) 5%, transparent)",
      }}
      role="group"
      aria-label={`Approval needed: ${proposal.label}`}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide opacity-70">
        <ShieldCheck size={14} aria-hidden />
        Needs your approval
      </div>

      <p className="mt-2 text-[14.5px] font-semibold leading-snug">{proposal.label}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed opacity-85">{proposal.proposal}</p>

      {detail.length > 0 && (
        <dl className="mt-2.5 grid gap-1 text-[12.5px] opacity-80">
          {detail.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="min-w-16 shrink-0 capitalize opacity-70">{k.replace(/_/g, " ")}</dt>
              <dd className="line-clamp-3 break-words">{String(v)}</dd>
            </div>
          ))}
        </dl>
      )}

      {proposal.needsIntegration && (
        <p className="mt-2 text-[12.5px] opacity-70">
          Requires your {proposal.needsIntegration === "google" ? "Google" : "Microsoft"} account — connect it in Settings first.
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try { await onApprove(proposal); } finally { setBusy(false); }
          }}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold disabled:opacity-60"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Check size={14} aria-hidden />}
          Approve
        </button>
        <button
          disabled={busy}
          onClick={() => onCancel(proposal)}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold disabled:opacity-60"
          style={{ background: "color-mix(in oklab, var(--foreground) 10%, transparent)" }}
        >
          <X size={14} aria-hidden />
          Not now
        </button>
      </div>
    </div>
  );
}
