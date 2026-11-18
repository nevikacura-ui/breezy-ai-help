import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PUVIO_APP_ID, PUVIO_ISSUER, PUVIO_TOKEN_URL } from "@/lib/puvio-config";

export const getOAuthConfigStatus = createServerFn({ method: "GET" }).handler(async () => {
  const secret = process.env.PUVIO_CLIENT_SECRET ?? null;
  return {
    issuer: PUVIO_ISSUER,
    issuerConfigured: true,
    clientId: process.env.PUVIO_CLIENT_ID ?? PUVIO_APP_ID,
    clientSecretConfigured: Boolean(secret),
    supabaseUrlConfigured: Boolean(process.env.EXTERNAL_SUPABASE_URL ?? process.env.SUPABASE_URL),
  };
});

export const runTokenExchange = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({
    tokenEndpoint: z.string().url().refine((value) => value === PUVIO_TOKEN_URL, "Only Puvio's production token endpoint is allowed."),
    code: z.string().min(1).max(4096),
    redirectUri: z.string().url().max(2048),
    codeVerifier: z.string().min(43).max(128).optional(),
  }).parse(input))
  .handler(async ({ data }) => {
    const clientId = process.env.PUVIO_CLIENT_ID ?? PUVIO_APP_ID;
    const clientSecret = process.env.PUVIO_CLIENT_SECRET ?? "";
    const startedAt = Date.now();
    try {
      const res = await fetch(PUVIO_TOKEN_URL, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        redirect: "manual",
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: data.code,
          redirect_uri: data.redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
          ...(data.codeVerifier ? { code_verifier: data.codeVerifier } : {}),
        }),
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs: Date.now() - startedAt,
        contentType: res.headers.get("content-type") ?? "",
        body: res.ok ? "Token exchange succeeded. Sensitive token fields are not displayed." : text.slice(0, 4000),
        networkError: null as string | null,
      };
    } catch (e) {
      return {
        ok: false,
        status: 0,
        statusText: "",
        durationMs: Date.now() - startedAt,
        contentType: "",
        body: "",
        networkError: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      };
    }
  });
