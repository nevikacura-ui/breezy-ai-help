import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles } from "lucide-react";
import ringAsset from "@/assets/tricolor-ring.png.asset.json";
import { LANGUAGES, type LangCode, t as tr } from "@/lib/i18n";
import { useSettings, useAuthUser, resetIndiaModeArtifacts } from "@/lib/askeasy";
import { clearMessages } from "@/lib/pro.functions";

export const Route = createFileRoute("/india")({
  head: () => ({
    meta: [
      { title: "AskIndia — India's own AI assistant" },
      { name: "description", content: "AskIndia — India's first AI chatbot. Ask anything in Hindi, Tamil, Bengali, and 10+ Indian languages." },
      { property: "og:title", content: "AskIndia — India's own AI" },
      { property: "og:description", content: "Ask anything, in your language." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: IndiaOnboarding,
});

function IndiaOnboarding() {
  const navigate = useNavigate();
  const { update, hydrated } = useSettings();
  const [selected, setSelected] = useState<LangCode>("hi");

  if (!hydrated) return <div className="min-h-dvh bg-white" />;

  const heading = tr(selected, "onboard.title");
  const sub = tr(selected, "onboard.subtitle");
  const choose = tr(selected, "onboard.choose");
  const cont = tr(selected, "onboard.continue");
  const pill = tr(selected, "onboard.pill");

  const enter = () => {
    update({ indiaMode: true, language: selected, indiaOnboarded: true });
    navigate({ to: "/" });
  };

  return (
    <main className="india relative min-h-dvh overflow-hidden bg-white text-foreground">
      {/* soft tricolor wash */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#FF9933]/25 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#138808]/25 to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col items-center px-6 pb-10 pt-14 text-center">
        <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-foreground/80">
          <Sparkles className="h-3 w-3" />
          {pill}
        </span>

        <div className="relative mt-8 h-40 w-40">
          <img
            src={ringAsset.url}
            alt="AskIndia tricolor spinner"
            className="h-full w-full animate-orb-spin object-contain drop-shadow-[0_10px_30px_rgba(255,153,51,0.35)]"
          />
        </div>

        <h1 className="mt-6 font-display text-4xl font-medium leading-tight tracking-[-0.03em] sm:text-5xl">
          {heading}
        </h1>
        <p className="mt-2 max-w-sm text-[15px] text-foreground/70">{sub}</p>

        <div className="mt-8 w-full text-left">
          <div className="mb-2 text-[11px] uppercase tracking-wider text-foreground/60">
            {choose}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {LANGUAGES.map((l) => {
              const active = selected === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => setSelected(l.code)}
                  className={
                    "rounded-2xl border p-2.5 text-center transition " +
                    (active
                      ? "border-[#FF9933] bg-[#FF9933]/10 shadow-sm"
                      : "border-border/60 bg-white hover:bg-foreground/[0.03]")
                  }
                >
                  <div className="text-[13px] font-medium leading-tight">{l.native}</div>
                  <div className="mt-0.5 text-[10px] text-foreground/50">{l.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={enter}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-[15px] font-semibold text-white shadow-lg transition active:scale-[0.98]"
          style={{ background: "linear-gradient(135deg, #FF9933, #138808)" }}
        >
          {cont}
          <ArrowRight className="h-4 w-4" />
        </button>

        <Link
          to="/"
          onClick={() => update({ indiaMode: false, language: "en", indiaOnboarded: true })}
          className="mt-4 text-[12px] text-foreground/50 hover:text-foreground/80"
        >
          Continue in English →
        </Link>

        <div className="mt-auto pt-8 text-[10px] text-foreground/40">
          🇮🇳 Made in India · Powered by AskEasy
        </div>
      </div>
    </main>
  );
}
