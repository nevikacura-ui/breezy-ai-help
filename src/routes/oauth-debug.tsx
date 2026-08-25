import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getOAuthConfigStatus, runTokenExchange } from "@/lib/puvio-diagnostics.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/oauth-debug")({
  head: () => ({
    meta: [
      { title: "OAuth Diagnostics — AskEasy" },
      { name: "description", content: "Inspect the AskEasy sign-in redirect URL, authorization parameters, and callback token exchange results while debugging." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "OAuth Diagnostics — AskEasy" },
      { property: "og:description", content: "Inspect the AskEasy sign-in redirect URL, authorization parameters, and callback token exchange results while debugging." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OAuthDebugPage,
});

const LOG_KEY = "askeasy.oauth.log";

type CallbackLogEntry = {
  at: string;
  url: string;
  params: Record<string, string>;
  note?: string;
};

/** Anything a callback route writes to localStorage under LOG_KEY shows up here. */
function readLog(): CallbackLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOG_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CallbackLogEntry[]) : [];
  } catch {
    return [];
  }
}

type ExchangeResult = Awaited<ReturnType<typeof runTokenExchange>>;

function OAuthDebugPage() {
  const clientId = import.meta.env['VITE_PUVIO_CLIENT_ID'] ?? "";
  const [origin, setOrigin] = useState("");
  const [config, setConfig] = useState<Awaited<ReturnType<typeof getOAuthConfigStatus>> | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [log, setLog] = useState<CallbackLogEntry[]>([]);
  const [session, setSession] = useState<{ signedIn: boolean; userId?: string; email?: string }>({ signedIn: false });

  const fetchConfig = useServerFn(getOAuthConfigStatus);
  const exchange = useServerFn(runTokenExchange);

  const [tokenEndpoint, setTokenEndpoint] = useState("https://puvio.ai/api/oauth/token");
  const [code, setCode] = useState("");
  const [codeVerifier, setCodeVerifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ExchangeResult | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
    setLog(readLog());
    const params = new URLSearchParams(window.location.search);
    const c = params.get("code");
    if (c) setCode(c);
    fetchConfig().then(setConfig).catch((e: unknown) => setConfigError(e instanceof Error ? e.message : String(e)));
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setSession(u ? { signedIn: true, userId: u.id, email: u.email } : { signedIn: false });
    });
  }, [fetchConfig]);

  const redirectUri = origin ? `${origin}/auth/callback` : "";

  const authParams = useMemo<Array<[string, string]>>(
    () => [
      ["client_id", clientId || "(missing VITE_PUVIO_CLIENT_ID)"],
      ["redirect_uri", redirectUri || "(unknown — client not mounted)"],
      ["response_type", "code"],
      ["scope", "openid profile email"],
      ["state", "(generated per sign-in attempt)"],
      ["code_challenge_method", "S256"],
    ],
    [clientId, redirectUri],
  );

  const authorizeUrl = useMemo(() => {
    const base = `${config?.issuer ?? "https://puvio.ai"}/auth`;
    const qs = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid profile email",
      state: "<state>",
      code_challenge: "<challenge>",
      code_challenge_method: "S256",
    });
    return `${base}?${qs.toString()}`;
  }, [config, clientId, redirectUri]);

  const onExchange = async () => {
    setBusy(true);
    setResult(null);
    setResultError(null);
    try {
      const r = await exchange({ data: { tokenEndpoint, code, redirectUri, codeVerifier: codeVerifier || undefined } });
      setResult(r);
    } catch (e) {
      setResultError(e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-5 py-10">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">OAuth diagnostics</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Internal debug view. Shows the redirect URL, the authorization parameters the app would send, and the verbatim
          result of a callback token exchange.
        </p>
      </header>

      <Section title="Environment">
        <Row label="Origin" value={origin || "…"} />
        <Row label="Redirect URI" value={redirectUri || "…"} mono />
        <Row label="VITE_PUVIO_CLIENT_ID" value={clientId || "NOT SET"} mono ok={Boolean(clientId)} />
        <Row label="PUVIO_ISSUER (server)" value={config?.issuer ?? (configError ? "error" : "…")} mono ok={config?.issuerConfigured} />
        <Row
          label="PUVIO_CLIENT_SECRET (server)"
          value={config ? (config.clientSecretConfigured ? `configured (${config.clientSecretLength} chars)` : "NOT SET") : "…"}
          ok={config?.clientSecretConfigured}
        />
        {configError && <p className="mt-2 text-[13px] text-destructive">Config check failed: {configError}</p>}
      </Section>

      <Section title="Authorization parameters">
        <div className="overflow-hidden rounded-xl border border-border/60">
          {authParams.map(([k, v]) => (
            <div key={k} className="flex gap-3 border-b border-border/40 px-3 py-2 text-[13px] last:border-b-0">
              <span className="w-44 shrink-0 font-mono text-muted-foreground">{k}</span>
              <span className="min-w-0 flex-1 break-all font-mono">{v}</span>
            </div>
          ))}
        </div>
        <label className="mt-3 block text-[12px] font-medium text-muted-foreground">Authorize URL preview</label>
        <textarea
          readOnly
          value={authorizeUrl}
          rows={4}
          className="mt-1 w-full resize-none rounded-xl border border-border/60 bg-background p-3 font-mono text-[12px]"
        />
        <button
          onClick={() => navigator.clipboard.writeText(authorizeUrl)}
          className="mt-2 rounded-full border border-border/60 px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/5"
        >
          Copy authorize URL
        </button>
      </Section>

      <Section title="Callback token exchange">
        <label className="block text-[12px] font-medium text-muted-foreground">Token endpoint</label>
        <input
          value={tokenEndpoint}
          onChange={(e) => setTokenEndpoint(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-[12px]"
        />
        <label className="mt-3 block text-[12px] font-medium text-muted-foreground">Authorization code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="paste the ?code= value from the callback"
          className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-[12px]"
        />
        <label className="mt-3 block text-[12px] font-medium text-muted-foreground">PKCE code_verifier (optional)</label>
        <input
          value={codeVerifier}
          onChange={(e) => setCodeVerifier(e.target.value)}
          className="mt-1 w-full rounded-xl border border-border/60 bg-background px-3 py-2 font-mono text-[12px]"
        />
        <button
          onClick={onExchange}
          disabled={busy || !code}
          className="mt-3 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background disabled:opacity-50"
        >
          {busy ? "Exchanging…" : "Run token exchange"}
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Runs server-side so the client secret never reaches the browser. The response below is verbatim.
        </p>

        {resultError && <pre className="mt-3 overflow-x-auto rounded-xl bg-destructive/10 p-3 text-[12px] text-destructive">{resultError}</pre>}
        {result && (
          <div className="mt-3 space-y-2">
            <Row label="Result" value={result.networkError ? "network error" : `${result.status} ${result.statusText}`} ok={result.ok} />
            <Row label="Duration" value={`${result.durationMs} ms`} />
            <Row label="Content-Type" value={result.contentType || "—"} mono />
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-xl border border-border/60 bg-foreground/[0.03] p-3 text-[12px]">
              {result.networkError ?? result.body ?? "(empty body)"}
            </pre>
          </div>
        )}
      </Section>

      <Section title="Callback history">
        {log.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No callback entries recorded yet. The callback route logs each return to <code className="font-mono">localStorage["{LOG_KEY}"]</code>.
          </p>
        ) : (
          <div className="space-y-2">
            {log.slice(0, 10).map((e, i) => (
              <div key={i} className="rounded-xl border border-border/60 p-3 text-[12px]">
                <div className="font-medium">{e.at}</div>
                <div className="mt-1 break-all font-mono text-muted-foreground">{e.url}</div>
                {e.note && <div className="mt-1">{e.note}</div>}
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(e.params, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => {
            window.localStorage.removeItem(LOG_KEY);
            setLog([]);
          }}
          className="mt-3 rounded-full border border-border/60 px-3 py-1.5 text-[12px] font-medium hover:bg-foreground/5"
        >
          Clear history
        </button>
      </Section>

      <Section title="App session">
        <Row label="Signed in" value={session.signedIn ? "yes" : "no"} ok={session.signedIn} />
        {session.signedIn && <Row label="User ID" value={session.userId ?? "—"} mono />}
        {session.signedIn && <Row label="Email" value={session.email ?? "—"} mono />}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value, mono, ok }: { label: string; value: string; mono?: boolean; ok?: boolean }) {
  return (
    <div className="flex gap-3 py-1 text-[13px]">
      <span className="w-44 shrink-0 text-muted-foreground">{label}</span>
      <span className={`min-w-0 flex-1 break-all ${mono ? "font-mono text-[12px]" : ""} ${ok === false ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}
