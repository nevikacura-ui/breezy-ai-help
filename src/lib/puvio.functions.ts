import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PUVIO_APP_ID, PUVIO_BILLING_RETURN_PATH } from "@/lib/puvio-config";

export const createPuvioCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const appId = process.env.PUVIO_APP_ID ?? PUVIO_APP_ID;
    const keyId = process.env.PUVIO_EXEC_KEY_ID ?? "";
    const signingKey = process.env.PUVIO_EXEC_SIGNING_KEY ?? "";
    if (!keyId || !signingKey) throw new Error("Puvio checkout is temporarily unavailable.");

    const claims = context.claims as { email?: string; phone?: string; user_metadata?: { full_name?: string } };
    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("display_name, full_name, email, phone")
      .eq("id" as never, context.userId)
      .maybeSingle();
    if (profileError) throw new Error(profileError.message);
    const customer = profile as unknown as { display_name?: string | null; full_name?: string | null; email?: string | null; phone?: string | null } | null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createPuvioCheckoutForUser } = await import("@/lib/puvio-billing.server");
    return createPuvioCheckoutForUser(supabaseAdmin, {
      appId,
      keyId,
      signingKey,
      returnUrl: `https://askeasy.ai${PUVIO_BILLING_RETURN_PATH}`,
    }, {
      userId: context.userId,
      requestId: data.requestId,
      email: customer?.email ?? claims.email ?? null,
      name: customer?.display_name ?? customer?.full_name ?? claims.user_metadata?.full_name ?? null,
      phone: customer?.phone ?? claims.phone ?? null,
    });
  });

const billingReturnSchema = z.object({
  id: z.string().min(1).max(256),
  status: z.string().min(1).max(32),
  ref: z.string().min(1).max(256),
  ts: z.string().regex(/^\d{10}$/),
  sig: z.string().max(256).optional(),
  signature: z.string().max(256).optional(),
}).refine((value) => Boolean(value.sig ?? value.signature), { message: "Missing billing signature." });

export const completePuvioBillingReturn = createServerFn({ method: "POST" })
  .inputValidator((input) => billingReturnSchema.parse(input))
  .handler(async ({ data }) => {
    const signingKey = process.env.PUVIO_EXEC_SIGNING_KEY ?? "";
    if (!signingKey) throw new Error("Puvio billing confirmation is temporarily unavailable.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { completePuvioBillingReturn: complete } = await import("@/lib/puvio-billing.server");
    return complete(supabaseAdmin, signingKey, {
      id: data.id,
      status: data.status.toLowerCase(),
      ref: data.ref,
      ts: data.ts,
      signature: data.sig ?? data.signature ?? "",
    });
  });
