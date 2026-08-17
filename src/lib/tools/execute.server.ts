// AskEasy tool layer — server-only executor.
// Every execution is validated against the tool's input schema, checked against
// the caller's permissions/integrations, and written to `action_audit`.
// Nothing here is importable from the browser (*.server.ts is blocked).

import { TOOL_BY_NAME, type ToolDef, type ToolResult } from "./registry";

const OR_URL = "https://openrouter.ai/api/v1/chat/completions";

type Ctx = {
  userId: string;
  /** Set when the user explicitly approved this exact call. */
  approved?: boolean;
  /** Prompt block describing what AskEasy already knows about the user. */
  about?: string;
  /** The user's preferred writing tone, if saved. */
  tone?: string;
};

async function ai(
  system: string,
  user: string,
  opts?: { json?: boolean; web?: boolean; model?: string },
): Promise<{ text: string; citations: { title?: string; url: string }[] }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("AI is not configured");

  const body: Record<string, unknown> = {
    model: opts?.model ?? "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (opts?.json) body.response_format = { type: "json_object" };
  if (opts?.web) body.plugins = [{ id: "web", max_results: 5 }];

  const res = await fetch(OR_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://askeasy.ai",
      "X-Title": "AskEasy",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);

  type Annotation = { url_citation?: { url?: string; title?: string } };
  const data = (await res.json()) as {
    choices?: { message?: { content?: string; annotations?: Annotation[] } }[];
    citations?: (string | { url?: string; title?: string })[];
  };
  const msg = data.choices?.[0]?.message;
  const citations: { title?: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const a of msg?.annotations ?? []) {
    const c = a.url_citation;
    if (c?.url && !seen.has(c.url)) { seen.add(c.url); citations.push({ url: c.url, title: c.title }); }
  }
  for (const c of data.citations ?? []) {
    const url = typeof c === "string" ? c : c?.url;
    const title = typeof c === "string" ? undefined : c?.title;
    if (url && !seen.has(url)) { seen.add(url); citations.push({ url, title }); }
  }
  return { text: msg?.content ?? "", citations };
}

const RIGOUR = `Ground every statement in the material you were given or a cited source.
Mark anything inferred as ASSUMPTION. If something required is missing, list it under "Missing".
Never invent figures, clauses, dates, laws or citations.`;

type Handler = (input: Record<string, unknown>, ctx: Ctx) => Promise<ToolResult>;

const HANDLERS: Record<string, Handler> = {
  web_search: async (input) => {
    const q = String(input.query);
    const fresh = input.freshness ? ` (${String(input.freshness)})` : "";
    const { text, citations } = await ai(
      `You are a research tool. Answer the query factually and concisely using the web results.
Lead with the answer, then the supporting detail. ${RIGOUR}`,
      `${q}${fresh}`,
      { web: true },
    );
    return { ok: true, tool: "web_search", output: text, citations };
  },

  extract_document: async (input) => {
    const fields = Array.isArray(input.fields) ? (input.fields as string[]) : [];
    const { text } = await ai(
      `You extract structured data from documents. Return JSON with keys:
doc_type, fields (object of extracted values), flags (array of unusual/inconsistent/risky items),
missing (array of information not present), what_it_means (one plain-language sentence for the user),
next_steps (array of 1-3 concrete actions). ${RIGOUR}`,
      `Document type hint: ${String(input.doc_type ?? "unknown")}
Fields wanted: ${fields.length ? fields.join(", ") : "everything that matters"}

DOCUMENT:
${String(input.text).slice(0, 60_000)}`,
      { json: true },
    );
    return { ok: true, tool: "extract_document", output: text, data: safeJson(text) };
  },

  compare_options: async (input) => {
    const options = (input.options as string[]).map((o, i) => `OPTION ${i + 1}:\n${o}`).join("\n\n");
    const criteria = Array.isArray(input.criteria) ? (input.criteria as string[]).join(", ") : "";
    const { text } = await ai(
      `You are a decision-support tool. Produce Markdown with:
1. a criteria comparison table, 2. trade-offs per option, 3. "Missing information",
4. one clearly reasoned recommendation, 5. what would change the recommendation. ${RIGOUR}`,
      `Goal: ${String(input.goal ?? "pick the better option")}
Criteria: ${criteria || "(decide sensible criteria yourself and say so)"}

${options}`,
    );
    return { ok: true, tool: "compare_options", output: text };
  },

  analyze_data: async (input) => {
    const { text } = await ai(
      `You analyse tabular data. Show the answer first, then the working (as a small table where useful),
then anything anomalous. Do not fabricate rows or totals — compute only from the given data. ${RIGOUR}`,
      `Question: ${String(input.question)}

DATA:
${String(input.data).slice(0, 60_000)}`,
    );
    return { ok: true, tool: "analyze_data", output: text };
  },

  classify_batch: async (input) => {
    const items = (input.items as string[]).slice(0, 200);
    const labels = Array.isArray(input.labels) ? (input.labels as string[]) : [];
    const { text } = await ai(
      `You classify batches of items. Return JSON: {"labels": string[], "results": [{"index": number,
"summary": string, "label": string, "urgency": "high"|"medium"|"low", "who": string,
"wants": string, "next_action": string}], "totals": object}. ${RIGOUR}`,
      `Labels: ${labels.length ? labels.join(", ") : "(choose useful buckets)"}

ITEMS:
${items.map((it, i) => `[${i + 1}] ${it}`).join("\n\n").slice(0, 60_000)}`,
      { json: true },
    );
    return { ok: true, tool: "classify_batch", output: text, data: safeJson(text) };
  },

  draft_message: async (input, ctx) => {
    const { text } = await ai(
      `You write ready-to-send messages. Output Markdown:
**Subject:** ... then the body. Then "— Shorter version" and "— Firmer version" only if genuinely useful.
Serve the objective exactly; never concede more than asked. No placeholders unless information is truly missing
(then use [square brackets] and list them under "Missing"). Sign off using what you know about the user —
never write [Your Name] when their name or role is known.${ctx.about ? "\n\n" + ctx.about : ""}`,
      `Objective: ${String(input.objective)}
Recipient: ${String(input.recipient ?? "unspecified")}
Tone: ${String(input.tone ?? ctx.tone ?? "professional and warm")}

Context:
${String(input.context ?? "(none given)").slice(0, 30_000)}`,
    );
    return { ok: true, tool: "draft_message", output: text };
  },

  generate_report: async (input, ctx) => {
    const { text } = await ai(
      `You prepare finished documents in Markdown. Include a title, clear sections, and only content
supported by the brief or source material. ${RIGOUR}${ctx.about ? "\n\n" + ctx.about : ""}`,
      `Title: ${String(input.title)}
Brief: ${String(input.brief)}

Source material:
${String(input.source_material ?? "(none)").slice(0, 60_000)}`,
    );
    return { ok: true, tool: "generate_report", output: text };
  },

  remember_about_me: async (input, ctx) => {
    const { rememberAboutUser } = await import("./memory.server");
    const facts = Array.isArray(input.facts) ? (input.facts as string[]) : [];
    const saved = await rememberAboutUser(ctx.userId, {
      role: input.role as string | undefined,
      business_context: input.business_context as string | undefined,
      tone: input.tone as string | undefined,
      facts,
    });
    const added = [
      input.role ? `role: ${String(input.role)}` : "",
      input.tone ? `tone: ${String(input.tone)}` : "",
      ...facts,
    ].filter(Boolean);
    return {
      ok: true,
      tool: "remember_about_me",
      output: added.length ? `Saved: ${added.join("; ")}.` : "Nothing new to save.",
      data: { facts: saved.facts.length },
    };
  },

  send_email: async () => ({
    ok: false,
    tool: "send_email",
    code: "NEEDS_INTEGRATION",
    error: "No mailbox is connected yet. Connect Gmail or Outlook in Settings, then approve again.",
  }),


  automate_with_cubix: async (input, ctx) => {
    const { compileAndHandoff } = await import("./cubix.server");
    return compileAndHandoff(String(input.request), ctx.userId);
  },
};

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  } catch {
    return undefined;
  }
}

/** Does the caller have this tool's integration connected? */
async function integrationConnected(userId: string, provider: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_integrations")
    .select("status")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();
  return (data as { status?: string } | null)?.status === "connected";
}

async function audit(
  userId: string,
  def: ToolDef,
  input: unknown,
  result: ToolResult,
  approved: boolean,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("action_audit").insert({
      user_id: userId,
      tool: def.auditEvent,
      input: JSON.parse(JSON.stringify(truncate(input))),
      output: JSON.parse(
        JSON.stringify({
          ok: result.ok,
          code: result.code ?? null,
          error: result.error ?? null,
          preview: (result.output ?? "").slice(0, 500),
        }),
      ),
      status: result.ok ? "ok" : (result.code ?? "error"),
      approved,
    });
  } catch (e) {
    console.error("[tools] audit write failed", e);
  }
}

function truncate(v: unknown): unknown {
  if (typeof v === "string") return v.slice(0, 2000);
  if (Array.isArray(v)) return v.slice(0, 20).map(truncate);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, truncate(x)]));
  }
  return v;
}

/**
 * Execute a tool. The executor is the only thing that can claim a result:
 * whatever it returns is the truth the model is allowed to report.
 */
export async function executeTool(
  name: string,
  rawInput: unknown,
  ctx: Ctx,
): Promise<ToolResult> {
  const def = TOOL_BY_NAME[name];
  if (!def) return { ok: false, tool: name, code: "UNKNOWN_TOOL", error: `Unknown tool: ${name}` };

  const parsed = def.input.safeParse(rawInput);
  if (!parsed.success) {
    const result: ToolResult = {
      ok: false,
      tool: name,
      code: "FAILED",
      error: `Invalid input: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
    };
    await audit(ctx.userId, def, rawInput, result, !!ctx.approved);
    return result;
  }

  if (def.requiresApproval && !ctx.approved) {
    return { ok: false, tool: name, code: "NEEDS_APPROVAL", error: "This action needs your approval." };
  }

  if (def.requiresIntegration && !(await integrationConnected(ctx.userId, def.requiresIntegration))) {
    const result: ToolResult = {
      ok: false,
      tool: name,
      code: "NEEDS_INTEGRATION",
      error: `Connect your ${def.requiresIntegration === "google" ? "Google" : "Microsoft"} account in Settings first.`,
    };
    await audit(ctx.userId, def, parsed.data, result, !!ctx.approved);
    return result;
  }

  let result: ToolResult;
  try {
    result = await HANDLERS[name](parsed.data as Record<string, unknown>, ctx);
  } catch (e) {
    result = { ok: false, tool: name, code: "FAILED", error: (e as Error).message };
  }
  await audit(ctx.userId, def, parsed.data, result, !!ctx.approved);
  return result;
}
