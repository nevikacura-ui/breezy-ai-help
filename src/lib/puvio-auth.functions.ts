import { createServerFn } from "@tanstack/react-start";

const ISSUER = "https://puvio.ai";

type ExchangeInput = { code: string; codeVerifier: string; redirectUri: string };

/**
 * Exchanges a Puvio authorization code for tokens, reads userinfo, then mints a
 * Supabase session for the verified email so auth.uid()/RLS keep working.
 * Returns a one-time email token_hash the browser verifies with supabase.auth.verifyOtp.
 */
export const exchangePuvioCode = createServerFn({ method: "POST" })
  .inputValidator((input: ExchangeInput) => {
    if (!input?.code) throw new Error("Missing authorization code");
    if (!input?.codeVerifier) throw new Error("Missing PKCE verifier");
    if (!input?.redirectUri?.startsWith("http")) throw new Error("Invalid redirect_uri");
    return input;
  })
  .handler(async ({ data }) => {
    const clientId = process.env["VITE_PUVIO_CLIENT_ID"] ?? process.env["PUVIO_CLIENT_ID"] ?? "";
    const clientSecret = process.env["PUVIO_CLIENT_SECRET"] ?? "";
    const issuer = process.env["PUVIO_ISSUER"] ?? ISSUER;

    const tokenRes = await fetch(`${issuer}/api/public/oauth/token`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: data.code,
        code_verifier: data.codeVerifier,
        redirect_uri: data.redirectUri,
        client_id: clientId,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      }),
    });
    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) throw new Error(`Puvio token exchange failed (${tokenRes.status}): ${tokenText.slice(0, 500)}`);
    const tokens = JSON.parse(tokenText) as { access_token?: string };
    if (!tokens.access_token) throw new Error("Puvio token response had no access_token");

    const infoRes = await fetch(`${issuer}/api/public/oauth/userinfo`, {
      headers: { authorization: `Bearer ${tokens.access_token}`, accept: "application/json" },
      redirect: "follow",
    });
    const infoText = await infoRes.text();
    if (!infoRes.ok) throw new Error(`Puvio userinfo failed (${infoRes.status}): ${infoText.slice(0, 500)}`);
    const info = JSON.parse(infoText) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string | null;
    };
    if (!info.email || info.email_verified === false) throw new Error("Puvio did not return a verified email");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const metadata = {
      full_name: info.name ?? null,
      avatar_url: info.picture ?? null,
      puvio_sub: info.sub ?? null,
      provider: "puvio",
    };

    let link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: info.email });
    if (link.error) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: info.email,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (created.error && !/already/i.test(created.error.message)) throw new Error(created.error.message);
      link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: info.email });
    } else if (link.data.user?.id) {
      await supabaseAdmin.auth.admin.updateUserById(link.data.user.id, { user_metadata: metadata });
    }
    if (link.error) throw new Error(link.error.message);

    const hashed = link.data.properties?.hashed_token;
    if (!hashed) throw new Error("Could not mint a session for this account");

    return { email: info.email, tokenHash: hashed };
  });
