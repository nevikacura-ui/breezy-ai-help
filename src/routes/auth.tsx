import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ next: z.string().optional() }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (next ?? "/") as "/" });
    });
  }, [navigate, next]);

  const signIn = async () => {
    setBusy(true);
    try {
      const dest = next && next.startsWith("/") ? next : "/";
      if (typeof window !== "undefined") sessionStorage.setItem("askeasy.postAuth", dest);
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Sign-in failed", { description: result.error.message });
        setBusy(false);
        return;
      }
      if (!result.redirected) navigate({ to: dest as "/" });
    } catch (e) {
      toast.error("Sign-in failed", { description: String(e) });
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="glass w-full max-w-sm rounded-3xl p-8 text-center">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-white"
          style={{ background: "var(--send-gradient)" }}
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-5 text-2xl font-semibold tracking-tight">Sign in to AskEasy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Save your chats, sync across devices, and unlock Pro securely.
        </p>
        <button
          onClick={signIn}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2.5 text-[14px] font-medium text-foreground shadow-sm transition hover:bg-foreground/5 disabled:opacity-60"
        >
          <GoogleIcon />
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        <p className="mt-6 text-[11px] text-muted-foreground">
          By continuing you agree to our terms & privacy.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
