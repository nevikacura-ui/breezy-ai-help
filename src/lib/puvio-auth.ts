// Puvio OAuth (PKCE) client helper.
// Contract: https://puvio.ai/.well-known/openid-configuration
const ISSUER = "https://puvio.ai";
const VERIFIER_KEY = "puvio.pkce.verifier";
const STATE_KEY = "puvio.oauth.state";
const NEXT_KEY = "puvio.postAuth";

function randomString(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer);
}

function base64url(buf: ArrayBuffer): string {
  const bin = String.fromCharCode(...new Uint8Array(buf));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function challenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

export const puvioAuth = {
  redirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  },

  async signIn(next = "/"): Promise<void> {
    const clientId = import.meta.env["VITE_PUVIO_CLIENT_ID"] as string | undefined;
    if (!clientId) throw new Error("VITE_PUVIO_CLIENT_ID is not configured");

    const verifier = randomString();
    const state = randomString(16);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(NEXT_KEY, next.startsWith("/") ? next : "/");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.redirectUri(),
      response_type: "code",
      scope: "profile email",
      state,
      code_challenge: await challenge(verifier),
      code_challenge_method: "S256",
    });
    window.location.assign(`${ISSUER}/oauth/authorize?${params.toString()}`);
  },

  takeVerifier(): string | null {
    const v = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    return v;
  },

  takeState(): string | null {
    const s = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return s;
  },

  takeNext(): string {
    const n = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return n && n.startsWith("/") ? n : "/";
  },

  async signOut(): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
  },
};
