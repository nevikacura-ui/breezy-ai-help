// AskEasy personalization memory — server-only.
// `user_context` holds durable facts about the user (role, business, tone,
// language, approved contacts, free-form facts). Tools and the chat system
// prompt read it so AskEasy stops asking the same questions and stops
// emitting [Your Name] placeholders.

export type UserContext = {
  role: string | null;
  business_context: string | null;
  tone: string | null;
  preferred_language: string | null;
  approved_contacts: string[];
  facts: string[];
};

const EMPTY: UserContext = {
  role: null,
  business_context: null,
  tone: null,
  preferred_language: null,
  approved_contacts: [],
  facts: [],
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string").slice(0, 40);
}

export async function loadUserContext(userId: string): Promise<UserContext> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_context")
      .select("role, business_context, tone, preferred_language, approved_contacts, facts")
      .eq("user_id", userId)
      .maybeSingle();
    if (!data) return EMPTY;
    const row = data as Record<string, unknown>;
    return {
      role: (row.role as string) ?? null,
      business_context: (row.business_context as string) ?? null,
      tone: (row.tone as string) ?? null,
      preferred_language: (row.preferred_language as string) ?? null,
      approved_contacts: asStringArray(row.approved_contacts),
      facts: asStringArray(row.facts),
    };
  } catch (e) {
    console.error("[memory] load failed", e);
    return EMPTY;
  }
}

/** Prompt block injected into tool + chat system prompts. Empty when nothing is known. */
export function contextBlock(ctx: UserContext): string {
  const lines: string[] = [];
  if (ctx.role) lines.push(`Role: ${ctx.role}`);
  if (ctx.business_context) lines.push(`Context: ${ctx.business_context}`);
  if (ctx.tone) lines.push(`Preferred tone: ${ctx.tone}`);
  for (const f of ctx.facts.slice(0, 15)) lines.push(`- ${f}`);
  if (lines.length === 0) return "";
  return `WHAT YOU ALREADY KNOW ABOUT THIS USER (use it; never ask for it again, never leave [placeholders] for anything listed here):\n${lines.join("\n")}`;
}

/** Merge new knowledge about the user. Facts are de-duplicated, capped at 40. */
export async function rememberAboutUser(
  userId: string,
  patch: {
    role?: string;
    business_context?: string;
    tone?: string;
    preferred_language?: string;
    facts?: string[];
  },
): Promise<UserContext> {
  const current = await loadUserContext(userId);
  const merged: UserContext = {
    role: patch.role?.trim() || current.role,
    business_context: patch.business_context?.trim() || current.business_context,
    tone: patch.tone?.trim() || current.tone,
    preferred_language: patch.preferred_language?.trim() || current.preferred_language,
    approved_contacts: current.approved_contacts,
    facts: Array.from(
      new Set([...current.facts, ...(patch.facts ?? []).map((f) => f.trim()).filter(Boolean)]),
    ).slice(-40),
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("user_context").upsert(
    {
      user_id: userId,
      role: merged.role,
      business_context: merged.business_context,
      tone: merged.tone,
      preferred_language: merged.preferred_language,
      facts: merged.facts,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
  return merged;
}

// -------- Per-agent memory --------
// Each agent (bot) keeps its own durable facts, separate from the global
// user context: what Vera knows about your travel style shouldn't leak into
// Arjun's study coaching.

export async function loadBotMemory(userId: string, botId: string): Promise<string[]> {
  if (!botId) return [];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("bot_memory")
      .select("facts")
      .eq("user_id", userId)
      .eq("bot_id", botId)
      .maybeSingle();
    return asStringArray((data as { facts?: unknown } | null)?.facts);
  } catch (e) {
    console.error("[memory] bot load failed", e);
    return [];
  }
}

export function botContextBlock(botName: string, facts: string[]): string {
  if (facts.length === 0) return "";
  return `WHAT YOU (${botName}) REMEMBER FROM PAST CHATS WITH THIS USER (use it naturally, never re-ask):\n${facts
    .slice(-20)
    .map((f) => `- ${f}`)
    .join("\n")}`;
}

export async function rememberForBot(
  userId: string,
  botId: string,
  facts: string[],
): Promise<string[]> {
  const current = await loadBotMemory(userId, botId);
  const merged = Array.from(
    new Set([...current, ...facts.map((f) => f.trim()).filter(Boolean)]),
  ).slice(-40);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("bot_memory")
    .upsert(
      { user_id: userId, bot_id: botId, facts: merged, updated_at: new Date().toISOString() },
      { onConflict: "user_id,bot_id" },
    );
  if (error) throw error;
  return merged;
}
