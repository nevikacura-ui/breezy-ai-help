// Per-user capability policy. Backed by `tool_permissions`:
//   allowed=false     → the capability is off; the tool refuses.
//   always_ask=true   → the tool becomes an approval-gated proposal even if
//                       the registry marks it safe.
// Missing row → registry defaults apply.

import type { ToolPermission } from "./registry";

export type Policy = Record<string, { allowed: boolean; alwaysAsk: boolean }>;

export async function loadPolicy(userId: string): Promise<Policy> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("tool_permissions")
      .select("permission, allowed, always_ask")
      .eq("user_id", userId);
    const out: Policy = {};
    for (const r of (data ?? []) as { permission: string; allowed: boolean; always_ask: boolean }[]) {
      out[r.permission] = { allowed: r.allowed !== false, alwaysAsk: r.always_ask === true };
    }
    return out;
  } catch (e) {
    console.error("[policy] load failed", e);
    return {};
  }
}

export function isAllowed(policy: Policy, p: ToolPermission): boolean {
  return policy[p]?.allowed !== false;
}

/** Registry default OR the user's own "always ask" preference. */
export function needsApproval(
  policy: Policy,
  p: ToolPermission,
  registryDefault: boolean,
): boolean {
  return registryDefault || policy[p]?.alwaysAsk === true;
}
