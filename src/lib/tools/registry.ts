// AskEasy tool layer — client-safe registry.
// Every tool declares: name, description, required permission, input schema,
// output shape, whether it needs the user's approval, and its audit event name.
// Handlers live in `execute.server.ts`; this file ships to the browser so the UI
// can render approval cards and permission settings without server imports.

import { z } from "zod";

export type ToolPermission =
  | "none"
  | "web"
  | "documents"
  | "email.read"
  | "email.send"
  | "calendar"
  | "files"
  | "automation";

export type ToolDef = {
  name: string;
  /** Shown to the model. */
  description: string;
  /** Shown to the user in approval cards and settings. */
  label: string;
  permission: ToolPermission;
  /** Integration that must be connected first (Phase 2+). */
  requiresIntegration?: "google" | "microsoft";
  /** When true the tool never runs without an explicit user approval tap. */
  requiresApproval: boolean;
  input: z.ZodTypeAny;
  /** JSON schema handed to the model (OpenAI/OpenRouter function-calling shape). */
  parameters: Record<string, unknown>;
  auditEvent: string;
};

const str = (description: string) => ({ type: "string", description });

export const TOOLS: ToolDef[] = [
  {
    name: "web_search",
    label: "Search the web",
    description:
      "Search the live web and return a short synthesis with source URLs. Use for current facts, prices, availability, news, company or product information.",
    permission: "web",
    requiresApproval: false,
    auditEvent: "tool.web_search",
    input: z.object({ query: z.string().min(2), freshness: z.string().optional() }),
    parameters: {
      type: "object",
      properties: {
        query: str("What to search for, phrased as a search query"),
        freshness: str("Optional recency hint, e.g. 'past week'"),
      },
      required: ["query"],
    },
  },
  {
    name: "extract_document",
    label: "Extract structured data",
    description:
      "Extract structured fields from document text the user provided (invoice, bill, contract, policy, statement, form). Returns JSON fields plus anything unusual worth flagging.",
    permission: "documents",
    requiresApproval: false,
    auditEvent: "tool.extract_document",
    input: z.object({
      text: z.string().min(10),
      doc_type: z.string().optional(),
      fields: z.array(z.string()).optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        text: str("The document text to extract from"),
        doc_type: str("What kind of document this is, if known"),
        fields: { type: "array", items: { type: "string" }, description: "Specific fields to pull out" },
      },
      required: ["text"],
    },
  },
  {
    name: "compare_options",
    label: "Compare options",
    description:
      "Compare two or more options (quotes, plans, products, vendors) against decision criteria and return a criteria table, trade-offs, missing information and one reasoned recommendation.",
    permission: "documents",
    requiresApproval: false,
    auditEvent: "tool.compare_options",
    input: z.object({
      options: z.array(z.string()).min(2),
      criteria: z.array(z.string()).optional(),
      goal: z.string().optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        options: { type: "array", items: { type: "string" }, description: "Each option described or pasted in full" },
        criteria: { type: "array", items: { type: "string" }, description: "What matters to the user" },
        goal: str("What the user is trying to achieve with this decision"),
      },
      required: ["options"],
    },
  },
  {
    name: "analyze_data",
    label: "Analyse a spreadsheet",
    description:
      "Analyse tabular data (CSV or spreadsheet text) and answer a question about it: totals, trends, outliers, classification, reconciliation.",
    permission: "documents",
    requiresApproval: false,
    auditEvent: "tool.analyze_data",
    input: z.object({ data: z.string().min(10), question: z.string().min(2) }),
    parameters: {
      type: "object",
      properties: {
        data: str("The CSV / table text"),
        question: str("What to work out from the data"),
      },
      required: ["data", "question"],
    },
  },
  {
    name: "classify_batch",
    label: "Classify a batch",
    description:
      "Classify many items at once (customer enquiries, emails, tickets, leads) into labelled buckets with urgency and a suggested next action for each.",
    permission: "documents",
    requiresApproval: false,
    auditEvent: "tool.classify_batch",
    input: z.object({
      items: z.array(z.string()).min(1),
      labels: z.array(z.string()).optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        items: { type: "array", items: { type: "string" }, description: "The items to classify" },
        labels: { type: "array", items: { type: "string" }, description: "Buckets to use; omit to let AskEasy choose" },
      },
      required: ["items"],
    },
  },
  {
    name: "draft_message",
    label: "Draft a message",
    description:
      "Write a ready-to-send message (email, reply, complaint, follow-up, enquiry response) that serves a stated objective. Drafting is safe; sending is a separate approved action.",
    permission: "documents",
    requiresApproval: false,
    auditEvent: "tool.draft_message",
    input: z.object({
      objective: z.string().min(3),
      context: z.string().optional(),
      recipient: z.string().optional(),
      tone: z.string().optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        objective: str("What this message must achieve or avoid conceding"),
        context: str("Original message or background"),
        recipient: str("Who it goes to"),
        tone: str("e.g. polite but firm, warm, formal"),
      },
      required: ["objective"],
    },
  },
  {
    name: "generate_report",
    label: "Prepare a document",
    description:
      "Prepare a finished document — report, summary, quotation, meeting notes, application, proposal — in Markdown, ready to copy or export.",
    permission: "documents",
    requiresApproval: false,
    auditEvent: "tool.generate_report",
    input: z.object({
      title: z.string().min(2),
      brief: z.string().min(3),
      source_material: z.string().optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        title: str("Document title"),
        brief: str("What the document must contain and who it is for"),
        source_material: str("Any material it must be based on"),
      },
      required: ["title", "brief"],
    },
  },
  {
    name: "remember_about_me",
    label: "Remember this about you",
    description:
      "Save durable facts about the user (their role, business, tone preference, how they sign off, recurring constraints) so future answers don't ask again. Call this whenever the user states something about themselves worth keeping. Never store passwords, card numbers or one-off details.",
    permission: "none",
    requiresApproval: false,
    auditEvent: "tool.remember_about_me",
    input: z.object({
      role: z.string().optional(),
      business_context: z.string().optional(),
      tone: z.string().optional(),
      facts: z.array(z.string()).optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        role: str("What the user does, e.g. 'runs a 6-person dental clinic'"),
        business_context: str("Their business or situation in one or two sentences"),
        tone: str("How they like replies written"),
        facts: { type: "array", items: { type: "string" }, description: "Short durable facts worth remembering" },
      },
    },
  },
  {
    name: "remember_for_this_agent",
    label: "Agent memory",
    description:
      "Save a fact that only THIS agent should remember about the user (preferences, goals, ongoing projects relevant to this agent's role). Use for agent-specific context; use remember_about_me for facts every agent should know.",
    permission: "none",
    requiresApproval: false,
    auditEvent: "tool.remember_for_this_agent",
    input: z.object({ facts: z.array(z.string()).min(1) }),
    parameters: {
      type: "object",
      properties: {
        facts: { type: "array", items: { type: "string" }, description: "Short durable facts for this agent only" },
      },
      required: ["facts"],
    },
  },
  {
    name: "create_reminder",
    label: "Create a reminder",
    description:
      "Save a reminder or follow-up for the user with an optional due date. Use whenever the user says to remind them, follow up, or not let them forget something.",
    permission: "none",
    requiresApproval: false,
    auditEvent: "tool.create_reminder",
    input: z.object({
      title: z.string().min(2),
      notes: z.string().optional(),
      due_at: z.string().optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        title: str("What to remind the user about, short and concrete"),
        notes: str("Optional extra detail"),
        due_at: str("Optional ISO-8601 date-time for when it is due"),
      },
      required: ["title"],
    },
  },
  {
    name: "list_reminders",
    label: "List reminders",
    description:
      "List the user's saved reminders and follow-ups. Use before answering questions about what they have coming up or what they asked to be reminded of.",
    permission: "none",
    requiresApproval: false,
    auditEvent: "tool.list_reminders",
    input: z.object({ status: z.enum(["open", "done", "all"]).optional() }),
    parameters: {
      type: "object",
      properties: { status: str("Filter: open, done or all. Defaults to open.") },
    },
  },
  {
    name: "send_email",
    label: "Send an email",
    description:
      "Send an email from the user's connected mailbox. ALWAYS requires the user's explicit approval; never call this to 'confirm' a draft the user has not approved.",
    permission: "email.send",
    requiresIntegration: "google",
    requiresApproval: true,
    auditEvent: "tool.send_email",
    input: z.object({
      to: z.string().min(3),
      subject: z.string().min(1),
      body: z.string().min(1),
      cc: z.string().optional(),
    }),
    parameters: {
      type: "object",
      properties: {
        to: str("Recipient email address"),
        subject: str("Subject line"),
        body: str("Full message body"),
        cc: str("Optional CC addresses"),
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "automate_with_cubix",
    label: "Automate with Cubix",
    description:
      "Turn a recurring request into an automation draft in Cubix.bot for the user to review. Requires approval. Never activates anything.",
    permission: "automation",
    requiresApproval: true,
    auditEvent: "tool.automate_with_cubix",
    input: z.object({ request: z.string().min(6) }),
    parameters: {
      type: "object",
      properties: { request: str("The recurring workflow, in one sentence") },
      required: ["request"],
    },
  },
];

export const TOOL_BY_NAME: Record<string, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.name, t]),
);

/** OpenRouter / OpenAI function-calling payload. */
export function toolsPayload(): unknown[] {
  return TOOLS.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

export type ToolProposal = {
  id: string;
  tool: string;
  label: string;
  permission: ToolPermission;
  input: Record<string, unknown>;
  /** Human-readable summary of what would happen. */
  proposal: string;
  needsIntegration?: "google" | "microsoft";
};

export type ToolResult = {
  ok: boolean;
  tool: string;
  /** Markdown-ready output for the chat. */
  output?: string;
  data?: unknown;
  citations?: { title?: string; url: string }[];
  error?: string;
  code?: "NEEDS_INTEGRATION" | "NEEDS_APPROVAL" | "FAILED" | "UNKNOWN_TOOL";
};

const PERMISSION_LABEL: Record<ToolPermission, string> = {
  none: "No access needed",
  web: "Web search",
  documents: "Your uploaded material",
  "email.read": "Read your email",
  "email.send": "Send email as you",
  calendar: "Your calendar",
  files: "Your files",
  automation: "Create automation drafts",
};

export function permissionLabel(p: ToolPermission): string {
  return PERMISSION_LABEL[p];
}

/** One-line, human-readable description of what a proposed tool call would do. */
export function summarizeProposal(tool: string, input: Record<string, unknown>): string {
  switch (tool) {
    case "send_email":
      return `Send an email to ${String(input.to ?? "—")} with the subject "${String(input.subject ?? "—")}".`;
    case "automate_with_cubix":
      return `Create an automation draft in Cubix for: ${String(input.request ?? "—")}. Nothing runs until you confirm it there.`;
    default:
      return `Run ${TOOL_BY_NAME[tool]?.label ?? tool}.`;
  }
}
