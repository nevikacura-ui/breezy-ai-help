import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { puvioAuth } from "@/lib/puvio-auth";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/auth/")({
  validateSearch: z.object({ next: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Sign in — AskEasy" },
      { name: "description", content: "Sign in to AskEasy with Puvio to save your chats, sync across devices and unlock Pro." },
      { property: "og:title", content: "Sign in — AskEasy" },
      { property: "og:description", content: "Sign in to AskEasy with Puvio to save your chats, sync across devices and unlock Pro." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = useSearch({ from: "/auth/" });
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"phone" | "otp">("phone");
  const [otpBusy, setOtpBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (next ?? "/") as "/" });
    });
  }, [navigate, next]);

  const signIn = async () => {
    setBusy(true);
    try {
      await puvioAuth.signIn(next && next.startsWith("/") ? next : "/");
    } catch (e) {
      toast.error("Sign-in failed", { description: e instanceof Error ? e.message : String(e) });
      setBusy(false);
    }
  };

  const sendCode = async () => {
    setOtpBusy(true);
    try {
      const res = await fetch("/api/public/otp/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not send code");
      toast.success(data.message ?? "Code sent");
      setStage("otp");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOtpBusy(false);
    }
  };

  const verifyCode = async () => {
    setOtpBusy(true);
    try {
      const res = await fetch("/api/public/otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, otp }),
      });
      const data = (await res.json()) as { token_hash?: string; error?: string };
      if (!res.ok || !data.token_hash) throw new Error(data.error ?? "Verification failed");
      const { error } = await supabase.auth.verifyOtp({ token_hash: data.token_hash, type: "magiclink" });
      if (error) throw error;
      navigate({ to: (next && next.startsWith("/") ? next : "/") as "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setOtpBusy(false);
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
          {busy ? "Redirecting…" : "Continue with Puvio"}
        </button>
        <div className="mt-6 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="h-px flex-1 bg-border/60" />
          or use your phone
          <span className="h-px flex-1 bg-border/60" />
        </div>

        {stage === "phone" ? (
          <div className="mt-4 space-y-2">
            <input
              inputMode="numeric"
              autoComplete="tel"
              placeholder="Mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-full border border-border/60 bg-background px-4 py-2.5 text-center text-[14px] outline-none focus:border-foreground/30"
            />
            <button
              onClick={sendCode}
              disabled={otpBusy || phone.replace(/\D/g, "").length < 10}
              className="w-full rounded-full px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-60"
              style={{ background: "var(--send-gradient)" }}
            >
              {otpBusy ? "Sending…" : "Send OTP"}
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-full border border-border/60 bg-background px-4 py-2.5 text-center text-[16px] tracking-[0.4em] outline-none focus:border-foreground/30"
            />
            <button
              onClick={verifyCode}
              disabled={otpBusy || otp.length !== 6}
              className="w-full rounded-full px-4 py-2.5 text-[14px] font-medium text-white disabled:opacity-60"
              style={{ background: "var(--send-gradient)" }}
            >
              {otpBusy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              onClick={() => { setStage("phone"); setOtp(""); }}
              className="w-full text-[12px] text-muted-foreground hover:text-foreground"
            >
              Change number
            </button>
          </div>
        )}

        <p className="mt-6 text-[11px] text-muted-foreground">
          By continuing you agree to our terms & privacy.
        </p>

      </div>
    </main>
  );
}
