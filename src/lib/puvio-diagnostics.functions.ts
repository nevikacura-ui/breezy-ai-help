import { createServerFn } from "@tanstack/react-start";

export const getOAuthConfigStatus = createServerFn({ method: "GET" }).handler(async () => {
  const issuer = process.env["PUVIO_ISSUER"] ?? null;
  const secret = process.env["PUVIO_CLIENT_SECRET"] ?? null;
  return {
    issuer,
    issuerConfigured: Boolean(issuer),
    clientSecretConfigured: Boolean(secret),
    clientSecretLength: secret ? secret.length : 0,
    supabaseUrlConfigured: Boolean(process.env["SUPABASE_URL"]),
  };
});

export const runTokenExchange = createServerFn({ method: "POST" })
  .inputValidator((input: { tokenEndpoint: string; code: string; redirectUri: string; codeVerifier?: string }) => {
    if (!/^https:\/\//.test(input.tokenEndpoint)) throw new Error("tokenEndpoint must be an https URL");
    if (!input.code) throw new Error("code is required");
    return input;
  })
  .handler(async ({ data }) => {
    const clientId = process.env["VITE_PUVIO_CLIENT_ID"] ?? "";
    const clientSecret = process.env["PUVIO_CLIENT_SECRET"] ?? "";
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code: data.code,
      redirect_uri: data.redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    if (data.codeVerifier) body.set("code_verifier", data.codeVerifier);

    const startedAt = Date.now();
    try {
      const res = await fetch(data.tokenEndpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: body.toString(),
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        durationMs: Date.now() - startedAt,
        contentType: res.headers.get("content-type") ?? "",
        // Verbatim provider response, truncated so a full HTML error page stays readable.
        body: text.slice(0, 4000),
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
