import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { exchangePuvioCode } from "@/lib/puvio-auth.functions";
import { puvioAuth } from "@/lib/puvio-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [
      { title: "Signing you in — AskEasy" },
      { name: "description", content: "Completing your secure Puvio sign-in for AskEasy." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Signing you in — AskEasy" },
      { property: "og:description", content: "Completing your secure Puvio sign-in for AskEasy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();
  const exchange = useServerFn(exchangePuvioCode);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setError(`${err}: ${params.get("error_description") ?? "Sign-in was cancelled."}`);
        return;
      }
      const code = params.get("code");
      const returnedState = params.get("state");
      const expectedState = puvioAuth.takeState();
      const verifier = puvioAuth.takeVerifier();
      const next = puvioAuth.takeNext();

      if (!code) return setError("No authorization code was returned.");
      if (expectedState && returnedState !== expectedState) return setError("State mismatch — please try signing in again.");
      if (!verifier) return setError("Sign-in session expired — please try again.");

      try {
        const { tokenHash, email } = await exchange({
          data: { code, codeVerifier: verifier, redirectUri: `${window.location.origin}/auth/callback` },
        });
        const { error: otpError } = await supabase.auth.verifyOtp({ type: "email", token_hash: tokenHash });
        if (otpError) throw new Error(otpError.message);
        if (typeof window !== "undefined") window.localStorage.setItem("askeasy.lastEmail", email);
        navigate({ to: next as "/", replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [exchange, navigate]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {error ? (
        <div className="glass w-full max-w-sm rounded-3xl p-8">
          <h1 className="font-display text-lg font-semibold">Sign-in failed</h1>
          <p className="mt-2 break-words text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="mt-5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Signing you in…
        </div>
      )}
    </main>
  );
}
