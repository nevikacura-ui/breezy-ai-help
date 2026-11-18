// Puvio OAuth/OIDC Authorization Code + PKCE client helper.
import { PUVIO_APP_ID, PUVIO_AUTHORIZE_URL } from "@/lib/puvio-config";

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

export function safePostAuthPath(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export const puvioAuth = {
  redirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  },

  async signIn(next = "/"): Promise<void> {
    const verifier = randomString();
    const state = randomString(16);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    sessionStorage.setItem(NEXT_KEY, safePostAuthPath(next));

    const params = new URLSearchParams({
      client_id: PUVIO_APP_ID,
      redirect_uri: this.redirectUri(),
      response_type: "code",
      scope: "openid profile email",
      state,
      code_challenge: await challenge(verifier),
      code_challenge_method: "S256",
    });
    window.location.assign(`${PUVIO_AUTHORIZE_URL}?${params.toString()}`);
  },

  takeVerifier(): string | null {
    const value = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    return value;
  },

  takeState(): string | null {
    const value = sessionStorage.getItem(STATE_KEY);
    sessionStorage.removeItem(STATE_KEY);
    return value;
  },

  takeNext(): string {
    const value = sessionStorage.getItem(NEXT_KEY);
    sessionStorage.removeItem(NEXT_KEY);
    return safePostAuthPath(value);
  },

  async signOut(): Promise<void> {
    const { supabase } = await import("@/integrations/supabase/client");
    await supabase.auth.signOut();
    sessionStorage.removeItem(VERIFIER_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(NEXT_KEY);
  },
};
