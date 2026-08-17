import { useEffect, useState } from "react";
import { Mail, Plug, ShieldCheck, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TOOLS, permissionLabel, type ToolPermission } from "@/lib/tools/registry";

type Integration = { provider: string; status: string; account_email: string | null };
type AuditRow = { id: string; tool: string; status: string; approved: boolean; created_at: string };
type PolicyRow = { permission: string; allowed: boolean; always_ask: boolean };
type PolicyMap = Record<string, { allowed: boolean; always_ask: boolean }>;

const PROVIDERS: { id: string; label: string; hint: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Gmail & Google", hint: "Read, triage and draft replies", icon: <Mail className="h-4 w-4" /> },
  { id: "microsoft", label: "Outlook & Microsoft", hint: "Read, triage and draft replies", icon: <Mail className="h-4 w-4" /> },
];

/** Which capabilities AskEasy may use, what's connected, and what it actually did. */
export function ConnectionsPanel() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [policy, setPolicy] = useState<PolicyMap>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: ints }, { data: rows }, { data: perms }] = await Promise.all([
        supabase.from("user_integrations").select("provider, status, account_email"),
        supabase
          .from("action_audit")
          .select("id, tool, status, approved, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        supabase.from("tool_permissions").select("permission, allowed, always_ask"),
      ]);
      if (cancelled) return;
      setIntegrations((ints as Integration[] | null) ?? []);
      setAudit((rows as AuditRow[] | null) ?? []);
      const map: PolicyMap = {};
      for (const r of (perms as PolicyRow[] | null) ?? []) {
        map[r.permission] = { allowed: r.allowed, always_ask: r.always_ask };
      }
      setPolicy(map);
    })();
    return () => { cancelled = true; };
  }, []);

  // Optimistic: the switch flips instantly, then persists for the server to read.
  const savePolicy = async (permission: string, patch: Partial<PolicyRow>) => {
    const next = {
      allowed: patch.allowed ?? policy[permission]?.allowed ?? true,
      always_ask: patch.always_ask ?? policy[permission]?.always_ask ?? false,
    };
    setPolicy((prev) => ({ ...prev, [permission]: next }));
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase
      .from("tool_permissions")
      .upsert({ user_id: auth.user.id, permission, ...next }, { onConflict: "user_id,permission" });
    if (error) toast.error("Couldn't save that preference.");
  };

  const statusOf = (id: string) =>
    integrations.find((i) => i.provider === id)?.status === "connected" ? "Connected" : "Not connected";

  const permissions = Array.from(new Set(TOOLS.map((t) => t.permission))) as ToolPermission[];


  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <Plug className="h-3.5 w-3.5" /> Connected accounts
        </div>
        {PROVIDERS.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-xl border px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              {p.icon}
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-[11.5px] text-muted-foreground">{p.hint}</div>
              </div>
            </div>
            <span className="text-[11.5px] text-muted-foreground">{statusOf(p.id)}</span>
          </div>
        ))}
        <p className="text-[11.5px] text-muted-foreground">
          Email connections arrive next. Until then AskEasy prepares drafts and never sends anything.
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" /> What AskEasy may use
        </div>
        <ul className="space-y-2.5">
          {permissions.map((p) => {
            const forcedAsk = TOOLS.some((t) => t.permission === p && t.requiresApproval);
            const row = policy[p];
            const allowed = row?.allowed !== false;
            const alwaysAsk = forcedAsk || row?.always_ask === true;
            return (
              <li key={p} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className={allowed ? "" : "text-muted-foreground line-through"}>{permissionLabel(p)}</span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!allowed || forcedAsk}
                    onClick={() => savePolicy(p, { always_ask: !alwaysAsk })}
                    className="rounded-full border px-2 py-0.5 text-[11px] disabled:opacity-50"
                    title={forcedAsk ? "This one always asks — it can't be automatic." : undefined}
                  >
                    {alwaysAsk ? "Always asks" : "Runs for you"}
                  </button>
                  <button
                    type="button"
                    onClick={() => savePolicy(p, { allowed: !allowed })}
                    className="rounded-full border px-2 py-0.5 text-[11px]"
                  >
                    {allowed ? "On" : "Off"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-[11.5px] text-muted-foreground">
          Turn a capability off and AskEasy won't use it, even if it would help.
        </p>
      </section>


      <section className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Recent actions
        </div>
        {audit.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground">Nothing yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {audit.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="truncate">{r.tool.replace(/^tool\./, "").replace(/_/g, " ")}</span>
                <span className="shrink-0 text-muted-foreground">
                  {r.approved ? "approved · " : ""}
                  {r.status} · {new Date(r.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
