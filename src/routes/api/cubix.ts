import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

// AskEasy → Cubix.bot handoff.
// AskEasy detects recurring work, compiles a structured automation specification,
// stores it as a DRAFT, and hands it to Cubix for the user to review and confirm.
// AskEasy NEVER activates an automation itself.

type Msg = { role: "user" | "assistant" | "system"; content: string };
type Body = { messages?: Msg[]; request?: string; botName?: string };

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

const j = (o: unknown, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });

const SPEC_PROMPT = `You compile a user's recurring request into a machine-readable automation specification for Cubix.bot.
Return ONLY a JSON object, no prose, no code fences, with exactly these keys:
title (short), summary (one plain-language sentence), intent, trigger {type: "schedule"|"event"|"manual", description, suggested_schedule},
conditions (string[]), actions (array of {step:number, action:string, tool:string, requires_approval:boolean}),
required_tools (string[]), data_sources (string[]), approvals (string[]), user_instructions (string), context (string).
Mark requires_approval true for anything that sends external communication, spends money, deletes data or changes an account.
Be concrete and faithful to what the user asked — never invent tools they did not mention or imply.`;

export const Route = createFileRoute("/api/cubix")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey) return j({ error: "AI is not configured" }, 500);
        if (!supabaseUrl || !supabaseKey) return j({ error: "Server auth not configured" }, 500);

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
        if (!token) return j({ error: "Sign in required" }, 401);

        const supa = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await supa.auth.getUser(token);
        if (userErr || !userData?.user) return j({ error: "Invalid session" }, 401);
        const userId = userData.user.id;

        let body: Body;
        try { body = (await request.json()) as Body; } catch { return j({ error: "Invalid JSON" }, 400); }

        const convo = (body.messages ?? []).slice(-12).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
        const ask = (body.request ?? "").trim();
        if (!convo && !ask) return j({ error: "Nothing to automate" }, 400);

        // --- 1. Compile the specification ---
        const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
              {
                role: "user",
                content: `Recurring request to automate:\n${ask || "(see conversation)"}\n\nConversation context:\n${convo}`,
              },
            ],
          }),
        });

        if (!upstream.ok) {
          const detail = await upstream.text();
          return j({ error: "Could not compile the automation", detail: detail.slice(0, 300) }, 502);
        }

        const raw = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
        const text = raw.choices?.[0]?.message?.content ?? "";
        let spec: AutomationSpec;
        try {
          spec = JSON.parse(text.replace(/^```json\s*|\s*```$/g, "")) as AutomationSpec;
        } catch {
          return j({ error: "Could not read the automation draft. Try describing the routine again." }, 502);
        }

        // --- 2. Persist as a DRAFT (never active) ---
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

        // --- 3. Hand off to Cubix (authenticated, user reviews there) ---
        const cubixUrl = process.env.CUBIX_API_URL;
        const cubixKey = process.env.CUBIX_API_KEY;
        let handoff: { ok: boolean; workflowId?: string; reviewUrl?: string; error?: string } = {
          ok: false,
          error: "Cubix is not connected yet — the draft is saved.",
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
            const out = (await res.json().catch(() => ({}))) as { id?: string; workflow_id?: string; review_url?: string; url?: string; error?: string };
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

        await supabaseAdmin.from("action_audit").insert({
          user_id: userId,
          tool: "cubix.handoff",
          input: { request: ask.slice(0, 500) },
          output: { spec_id: specId, ...handoff },
          status: handoff.ok ? "ok" : "pending",
          approved: false,
        });

        return j({ specId, spec, handoff });
      },
    },
  },
});
