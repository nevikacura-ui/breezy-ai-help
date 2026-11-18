import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PUVIO_APP_ID, PUVIO_ISSUER, PUVIO_TOKEN_URL, PUVIO_USERINFO_URL } from "@/lib/puvio-config";

const exchangeSchema = z.object({
  code: z.string().min(1).max(4096),
  codeVerifier: z.string().min(43).max(128),
  redirectUri: z.string().url().max(2048),
});

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
});

const userInfoSchema = z.object({
  sub: z.string().min(1).max(512),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().max(300).optional(),
  picture: z.string().url().nullable().optional(),
});

/**
 * Exchanges a Puvio authorization code, verifies userinfo, maps sub to the
 * AskEasy profile, and returns a one-time token for the browser session.
 */
export const exchangePuvioCode = createServerFn({ method: "POST" })
  .inputValidator((input) => exchangeSchema.parse(input))
  .handler(async ({ data }) => {
    const callback = new URL(data.redirectUri);
    if (callback.pathname !== "/auth/callback" || (callback.protocol !== "https:" && callback.hostname !== "localhost")) {
      throw new Error("Invalid Puvio callback URL.");
    }
    const clientId = process.env.PUVIO_CLIENT_ID ?? PUVIO_APP_ID;
    const clientSecret = process.env.PUVIO_CLIENT_SECRET ?? "";
    if (!clientSecret) throw new Error("Puvio sign-in is temporarily unavailable.");

    const tokenRes = await fetch(PUVIO_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      redirect: "manual",
      body: JSON.stringify({
        grant_type: "authorization_code",
        code: data.code,
        code_verifier: data.codeVerifier,
        redirect_uri: data.redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenText = await tokenRes.text();
    if (!tokenRes.ok) throw new Error(`Puvio token exchange failed (${tokenRes.status}). Please try signing in again.`);
    let tokenJson: unknown;
    try { tokenJson = JSON.parse(tokenText); } catch { throw new Error("Puvio returned an invalid token response."); }
    const tokens = tokenSchema.parse(tokenJson);

    const infoRes = await fetch(PUVIO_USERINFO_URL, {
      headers: { authorization: `Bearer ${tokens.access_token}`, accept: "application/json" },
      redirect: "manual",
    });
    const infoText = await infoRes.text();
    if (!infoRes.ok) throw new Error(`Puvio userinfo failed (${infoRes.status}). Please try signing in again.`);
    let infoJson: unknown;
    try { infoJson = JSON.parse(infoText); } catch { throw new Error("Puvio returned invalid profile data."); }
    const info = userInfoSchema.parse(infoJson);
    if (info.email_verified === false) throw new Error("Puvio did not return a verified email.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const metadata = {
      full_name: info.name ?? null,
      avatar_url: info.picture ?? null,
      puvio_sub: info.sub,
      provider: "puvio",
    };

    let isNewUser = false;
    let link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: info.email });
    if (link.error) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: info.email,
        email_confirm: true,
        user_metadata: metadata,
      });
      if (created.error && !/already/i.test(created.error.message)) throw new Error(created.error.message);
      isNewUser = !created.error;
      link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: info.email });
    }
    if (link.error) throw new Error(link.error.message);
    const userId = link.data.user?.id;
    if (!userId) throw new Error("Could not map your Puvio identity to an AskEasy account.");

    const existingMetadata = (link.data.user.user_metadata ?? {}) as Record<string, unknown>;
    const { error: userUpdateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...existingMetadata, ...metadata },
    });
    if (userUpdateError) throw new Error(userUpdateError.message);

    const now = new Date().toISOString();
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: userId,
      display_name: info.name ?? null,
      full_name: info.name ?? null,
      avatar_url: info.picture ?? null,
      email: info.email,
      updated_at: now,
    } as never, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);

    const { error: identityError } = await supabaseAdmin.from("askeasy_profiles" as never).upsert({
      id: userId,
      puvio_sub: info.sub,
      display_name: info.name ?? null,
      full_name: info.name ?? null,
      avatar_url: info.picture ?? null,
      email: info.email,
      updated_at: now,
    } as never, { onConflict: "id" });
    if (identityError) throw new Error(identityError.message);

    const tokenExpiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;
    const sessionMetadata = { provider: "puvio", issuer: PUVIO_ISSUER, email: info.email, name: info.name ?? null };
    const { data: existingSession } = await supabaseAdmin
      .from("askeasy_puvio_sessions" as never)
      .select("id")
      .eq("puvio_sub", info.sub)
      .limit(1)
      .maybeSingle();
    const sessionResult = existingSession
      ? await supabaseAdmin.from("askeasy_puvio_sessions" as never).update({
          user_id: userId,
          token_expires_at: tokenExpiresAt,
          session_metadata: sessionMetadata,
          updated_at: now,
        } as never).eq("id", (existingSession as { id: string }).id)
      : await supabaseAdmin.from("askeasy_puvio_sessions" as never).insert({
          id: crypto.randomUUID(),
          user_id: userId,
          puvio_sub: info.sub,
          token_expires_at: tokenExpiresAt,
          session_metadata: sessionMetadata,
          created_at: now,
          updated_at: now,
        } as never);
    if (sessionResult.error) throw new Error(sessionResult.error.message);

    const hashed = link.data.properties?.hashed_token;
    if (!hashed) throw new Error("Could not mint a session for this account.");

    if (isNewUser) {
      try {
        const { sendWelcomeEmail } = await import("@/lib/mailer.server");
        await sendWelcomeEmail(info.email, info.name ?? null);
      } catch (error) {
        console.error("Puvio welcome email failed", error);
      }
    }

    return { email: info.email, tokenHash: hashed };
  });
