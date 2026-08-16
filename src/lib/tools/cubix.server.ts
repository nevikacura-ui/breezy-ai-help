// Cubix.bot handoff, exposed through the tool layer.
// AskEasy compiles a structured automation spec, saves it as a DRAFT and hands
// it to Cubix for the user to review. It never activates an automation itself.

import type { ToolResult } from "./registry";

export type AutomationSpec = {
  title: string;
  summary: string;
  intent: string;
  trigger: { type: "schedule" | "event" | "manual"; description: string; suggested_schedule?: string };
  conditions: string[];
  actions: { step: number; action: string; tool?: string; requires_approval: boolean }[];
  required_tools: string[];
  data_sources: string[];
  approvals: string[];
  user_instructions: string;
  context: string;
};

export const SPEC_PROMPT = `You compile a user's recurring request into a machine-readable automation specification for Cubix.bot.
Return ONLY a JSON object, no prose, no code fences, with exactly these keys:
title (short), summary (one plain-language sentence), intent, trigger {type: "schedule"|"event"|"manual", description, suggested_schedule},
conditions (string[]), actions (array of {step:number, action:string, tool:string, requires_approval:boolean}),
required_tools (string[]), data_sources (string[]), approvals (string[]), user_instructions (string), context (string).
Mark requires_approval true for anything that sends external communication, spends money, deletes data or changes an account.
Be concrete and faithful to what the user asked — never invent tools they did not mention or imply.`;

export async function compileSpec(request: string, context: string): Promise<AutomationSpec | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://askeasy.ai",
      "X-Title": "AskEasy",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SPEC_PROMPT },
        { role: "user", content: `Recurring request to automate:\n${request}\n\nConversation context:\n${context}` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  const raw = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = raw.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as AutomationSpec;
  } catch {
    return null;
  }
}

export async function saveAndHandoff(
  spec: AutomationSpec,
  userId: string,
): Promise<{ specId?: string; handoff: { ok: boolean; workflowId?: string; reviewUrl?: string; error?: string } }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("automation_specs")
    .insert({
      user_id: userId,
      title: spec.title ?? "Automation",
      summary: spec.summary ?? "",
      spec: JSON.parse(JSON.stringify(spec)),
      status: "draft",
    })
    .select("id")
    .single();

  const specId = row?.id as string | undefined;

  const cubixUrl = process.env.CUBIX_API_URL;
  const cubixKey = process.env.CUBIX_API_KEY;
  let handoff: { ok: boolean; workflowId?: string; reviewUrl?: string; error?: string } = {
    ok: false,
    error: "Cubix is not connected yet — the draft is saved for review.",
  };

  if (cubixUrl && cubixKey) {
    try {
      const res = await fetch(cubixUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cubixKey}`,
          "X-Source": "askeasy",
        },
        body: JSON.stringify({
          source: "askeasy",
          external_user_id: userId,
          spec_id: specId,
          status: "draft",
          requires_user_confirmation: true,
          spec,
        }),
      });
      const out = (await res.json().catch(() => ({}))) as {
        id?: string; workflow_id?: string; review_url?: string; url?: string; error?: string;
      };
      handoff = res.ok
        ? { ok: true, workflowId: out.workflow_id ?? out.id, reviewUrl: out.review_url ?? out.url }
        : { ok: false, error: out.error ?? `Cubix returned ${res.status}` };
    } catch (e) {
      handoff = { ok: false, error: (e as Error).message };
    }

    if (specId) {
      await supabaseAdmin
        .from("automation_specs")
        .update({
          status: handoff.ok ? "sent_to_cubix" : "draft",
          cubix_workflow_id: handoff.workflowId ?? null,
          cubix_review_url: handoff.reviewUrl ?? null,
          error: handoff.ok ? null : (handoff.error ?? null),
          updated_at: new Date().toISOString(),
        })
        .eq("id", specId);
    }
  }

  return { specId, handoff };
}

/** Tool-layer entry point. */
export async function compileAndHandoff(request: string, userId: string): Promise<ToolResult> {
  const spec = await compileSpec(request, "");
  if (!spec) {
    return {
      ok: false,
      tool: "automate_with_cubix",
      code: "FAILED",
      error: "Couldn't read the automation draft. Try describing the routine again.",
    };
  }
  const { specId, handoff } = await saveAndHandoff(spec, userId);
  const steps = (spec.actions ?? [])
    .map((a) => `${a.step}. ${a.action}${a.requires_approval ? " *(needs your approval)*" : ""}`)
    .join("\n");
  const output = `**Automation draft: ${spec.title}**

${spec.summary}

**Trigger:** ${spec.trigger?.description ?? "—"}${spec.trigger?.suggested_schedule ? ` (${spec.trigger.suggested_schedule})` : ""}

**Steps**
${steps || "—"}

${handoff.ok
  ? `Saved as a draft and sent to Cubix for your review${handoff.reviewUrl ? `: ${handoff.reviewUrl}` : "."}`
  : `Saved as a draft. ${handoff.error ?? ""}`}
It is **not** active — nothing runs until you confirm it in Cubix.`;

  return { ok: true, tool: "automate_with_cubix", output, data: { specId, spec, handoff } };
}
