import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { PRESET_BOTS } from "@/lib/bots";
import { PUVIO_REPORT_URL } from "@/lib/puvio-config";
import { createPuvioCheckoutForUser, type PuvioBillingConfig } from "@/lib/puvio-billing.server";

type AdminClient = SupabaseClient<Database>;
type Input = Record<string, unknown>;

export const PUVIO_CAPABILITIES = [
  {
    action: "puvio.connectivity_probe",
    description: "Verify AskEasyAI's signed Protocol 1.1 receiver.",
    idempotent: true,
  },
  {
    action: "askeasy.list_agents",
    description: "List AskEasy's public Pals, Guides, Toons, and Pros.",
    idempotent: true,
  },
  {
    action: "askeasy.list_plans",
    description: "List active AskEasy plans and their INR prices and limits.",
    idempotent: true,
  },
  {
    action: "askeasy.create_checkout",
    description: "Create a signed INR Razorpay checkout for AskEasy Pro through Puvio Centralized Billing.",
    idempotent: true,
  },
  {
    action: "puvio.discovery_report",
    description: "Submit AskEasyAI's current Protocol 1.1 capability report to Puvio.",
    idempotent: true,
  },
] as const;

async function listPlans(admin: AdminClient) {
  const { data, error } = await admin
    .from("askeasy_plans" as never)
    .select("code, name, price_inr, billing_period, tagline, features, limits")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function submitDiscoveryReport(admin: AdminClient, appId: string, submissionToken: string) {
  const plans = await listPlans(admin);
  const response = await fetch(PUVIO_REPORT_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${submissionToken}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    redirect: "manual",
    body: JSON.stringify({
      app_id: appId,
      app_name: "AskEasyAI",
      domain: "https://askeasy.ai",
      protocol: "1.1",
      receiver_url: "https://askeasy.ai/api/public/puvio/execute",
      callback_url: "https://askeasy.ai/auth/callback",
      billing_return_url: "https://askeasy.ai/billing/return",
      capabilities: PUVIO_CAPABILITIES,
      billing: { currencies: ["INR"], providers: { INR: "razorpay" }, automatic_renewal: false },
      plans,
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Puvio discovery report failed (${response.status}): ${text.slice(0, 300)}`);
  let body: unknown = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = {}; }
  return { submitted: true, capability_count: PUVIO_CAPABILITIES.length, response: body };
}

export async function executePuvioCapability(
  admin: AdminClient,
  action: string,
  input: Input,
  config: { appId: string; submissionToken: string; billing: PuvioBillingConfig },
): Promise<unknown> {
  switch (action) {
    case "askeasy.list_agents":
      return {
        agents: PRESET_BOTS.map((bot) => ({
          id: bot.id,
          name: bot.name,
          family: bot.family ?? "toons",
          category: bot.category,
          tagline: bot.tagline,
        })),
      };
    case "askeasy.list_plans":
      return { plans: await listPlans(admin), currency: "INR" };
    case "askeasy.create_checkout": {
      if (typeof input.user_id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.user_id)) {
        throw new Error("user_id must be a valid AskEasy account UUID.");
      }
      const requestId = typeof input.request_id === "string" ? input.request_id : crypto.randomUUID();
      if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("request_id must be a UUID.");
      const { data: profile, error } = await admin
        .from("profiles")
        .select("email, full_name, display_name, phone")
        .eq("id" as never, input.user_id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!profile) throw new Error("AskEasy account not found.");
      const customer = profile as unknown as { email?: string | null; full_name?: string | null; display_name?: string | null; phone?: string | null };
      return createPuvioCheckoutForUser(admin, config.billing, {
        userId: input.user_id,
        requestId,
        email: customer.email,
        name: customer.display_name ?? customer.full_name,
        phone: customer.phone,
      });
    }
    case "puvio.discovery_report":
      if (!config.submissionToken) throw new Error("Puvio discovery reporting is not configured.");
      return submitDiscoveryReport(admin, config.appId, config.submissionToken);
    default:
      throw new Error(`Unsupported AskEasy capability: ${action}`);
  }
}
