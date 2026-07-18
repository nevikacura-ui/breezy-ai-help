import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Settings2, SlidersHorizontal, Star, Plus, X } from "lucide-react";
import {
  PRESET_BOTS,
  CATEGORY_LABELS,
  useCustomBots,
  useOnboarding,
  type Bot,
  type BotCategory,
} from "@/lib/bots";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { BotAvatar, preloadBotAvatars } from "@/components/askeasy/BotAvatar";
import { useAuthUser, useSettings, useUsage, PERSONAS, type Persona } from "@/lib/askeasy";
import logoAsset from "@/assets/askeasy-logo.png.asset.json";
import easy from "@/assets/bots/easy.png";

const WELCOME_DISMISSED_KEY = "askeasy.welcome.dismissed.v1";

/** Persona × warmth → a short, tuned greeting for the home screen. */
function personaWelcome(persona: Persona, warmth: number, name: string): { title: string; sub: string; emoji: string } {
  const hi = name ? `, ${name}` : "";
  const cozy = warmth >= 75;
  switch (persona) {
    case "kid":
      return {
        emoji: "🎈",
        title: cozy ? `Yay${hi}! Easy's here 🎉` : `Hi${hi}! Ready to play?`,
        sub: cozy ? "Let's explore fun stuff together — pick a buddy below!" : "Pick a chatbot friend and let's start.",
      };
    case "teen":
      return {
        emoji: "🎧",
        title: cozy ? `Hey${hi} — good to see you` : `What's up${hi}?`,
        sub: cozy ? "Your crew of bots is warmed up. Jump in whenever." : "Pick a bot below and go.",
      };
    case "elder":
      return {
        emoji: "🌿",
        title: cozy ? `Welcome${hi}. Take your time.` : `Hello${hi}.`,
        sub: cozy ? "I'll be gentle and clear. Choose any helper below." : "Choose a helper below when you're ready.",
      };
    case "adult":
    default:
      return {
        emoji: "☕",
        title: cozy ? `Welcome back${hi} — glad you're here` : `Welcome${hi}`,
        sub: cozy ? "Your bots are ready. Pick one and let's get to it." : "Pick a bot below to get started.",
      };
  }
}

export const Route = createFileRoute("/bots")({
  head: () => ({
    meta: [
      { title: "Askeasy — Personalized AI bots" },
      { name: "description", content: "Browse a collection of personalized AI chatbots led by Easy, your cute AI companion. Cook, code, learn, storytell — pick your bot and start a conversation." },
      { property: "og:title", content: "Askeasy — Personalized AI bots" },
      { property: "og:description", content: "Browse a collection of personalized AI chatbots led by Easy, your cute AI companion." },
    ],
  }),
  component: BotsHome,
});

function BotsHome() {
  const nav = useNavigate();
  const { state, hydrated } = useOnboarding();
  const { bots: customBots } = useCustomBots();
  const { settings, update } = useSettings();
  const { usage } = useUsage();
  const user = useAuthUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"top" | "new">("top");
  const [activeCategory, setActiveCategory] = useState<BotCategory>("all");
  const [welcomeVisible, setWelcomeVisible] = useState(false);

  // Show the personalized welcome the first time the user lands post-onboarding,
  // and again if their persona changes.
  useEffect(() => {
    if (!hydrated || !state.completed) return;
    try {
      const seen = localStorage.getItem(WELCOME_DISMISSED_KEY);
      if (seen !== settings.persona) setWelcomeVisible(true);
    } catch {
      setWelcomeVisible(true);
    }
  }, [hydrated, state.completed, settings.persona]);

  const dismissWelcome = () => {
    setWelcomeVisible(false);
    try { localStorage.setItem(WELCOME_DISMISSED_KEY, settings.persona); } catch { /* ignore */ }
  };

  const welcome = useMemo(
    () => personaWelcome(settings.persona, settings.warmth, settings.name),
    [settings.persona, settings.warmth, settings.name],
  );

  // Redirect through splash if never seen
  if (hydrated && !state.seenSplash) {
    nav({ to: "/splash" });
  }

  const allBots = useMemo<Bot[]>(() => [...customBots, ...PRESET_BOTS], [customBots]);
  const featured = useMemo(() => PRESET_BOTS.filter((b) => b.featured), []);
  const filtered = useMemo(() => {
    if (activeCategory === "all") return allBots;
    return allBots.filter((b) => b.category === activeCategory);
  }, [allBots, activeCategory]);

  // Warm avatar decode cache once so the hub + chat feel instant.
  useEffect(() => {
    preloadBotAvatars(allBots.map((b) => b.avatar));
  }, [allBots]);

  return (
    <main
      className="relative min-h-dvh overflow-x-hidden pb-6"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Settings"
        >
          <Settings2 className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <img
            src="/favicon.png"
            alt=""
            className="h-8 w-8 object-contain"
            width={64}
            height={64}
            loading="eager"
            decoding="async"
          />
          <span className="font-display text-[1.1rem] tracking-tight">Askeasy</span>
        </div>
        <button
          className="relative flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span
            className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full"
            style={{ background: "var(--butter)" }}
          />
        </button>
      </header>

      {/* Personalized welcome — tuned to persona + warmth */}
      {welcomeVisible && (
        <div className="px-5 pt-4">
          <div
            className="animate-tile-in relative flex items-start gap-3 overflow-hidden rounded-3xl p-4"
            style={{
              background: "color-mix(in oklab, var(--butter) 14%, transparent)",
              border: "1px solid color-mix(in oklab, var(--butter) 28%, transparent)",
            }}
            role="status"
            aria-live="polite"
          >
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl"
              style={{ background: "color-mix(in oklab, var(--butter) 25%, transparent)" }}
              aria-hidden
            >
              {welcome.emoji}
            </span>
            <div className="min-w-0 flex-1 pr-6">
              <div className="font-display text-[1.05rem] leading-tight" style={{ color: "var(--cream)" }}>
                {welcome.title}
              </div>
              <p className="mt-1 text-[12.5px] leading-snug opacity-70">{welcome.sub}</p>
              <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-wider opacity-50">
                {PERSONAS.find((p) => p.id === settings.persona)?.label} tone · warmth {settings.warmth}
              </p>
            </div>
            <button
              onClick={dismissWelcome}
              aria-label="Dismiss welcome"
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100"
              style={{ background: "color-mix(in oklab, var(--cream) 10%, transparent)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}


      {/* Rounded page container — like a phone card */}
      <section
        className="mx-3 mt-5 rounded-[2rem] px-4 pb-6 pt-5"
        style={{ background: "var(--cream)", color: "var(--ink)" }}
      >
        {/* Subscription hero */}
        <div
          className="relative flex items-center justify-between overflow-hidden rounded-3xl p-4"
          style={{ background: "var(--ink)", color: "var(--cream)" }}
        >
          <div className="max-w-[60%]">
            <div className="text-[15px] font-semibold leading-tight">Chat with Easy & friends</div>
            <p className="mt-1 text-[12px] opacity-70">Your cute AI companion, always ready.</p>
            <button
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider"
              style={{ background: "var(--lavender)", color: "var(--ink)" }}
            >
              Unlock Pro $25/year
            </button>
          </div>
          <img src={easy} alt="Easy mascot" className="h-24 w-24 object-contain" width={192} height={192} loading="lazy" />
        </div>

        {/* Feature icons */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {[
            { label: "Custom\nChat Bots", emoji: "🤖" },
            { label: "Encrypted\nConversation", emoji: "🔒" },
            { label: "Multi Lingual\nSupport", emoji: "🌐" },
          ].map((f, i) => (
            <Link
              key={i}
              to={i === 0 ? "/bots/new" : "/bots"}
              className="flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all active:scale-95"
              style={{ borderColor: "color-mix(in oklab, var(--ink) 10%, transparent)", background: "#fff" }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--ink)", color: "var(--butter)" }}>
                <span className="text-[15px]">{f.emoji}</span>
              </span>
              <span className="whitespace-pre-line text-[11px] font-semibold leading-tight">{f.label}</span>
            </Link>
          ))}
        </div>

        {/* Divider label */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <span className="h-px flex-1" style={{ background: "color-mix(in oklab, var(--ink) 14%, transparent)" }} />
          <span className="text-[12px] font-semibold uppercase tracking-wider opacity-60">Unlock chatbots</span>
          <span className="h-px flex-1" style={{ background: "color-mix(in oklab, var(--ink) 14%, transparent)" }} />
        </div>

        {/* Top / New tabs */}
        <div className="mt-4 flex justify-center">
          <div
            className="flex items-center gap-1 rounded-full p-1"
            style={{ background: "color-mix(in oklab, var(--ink) 6%, transparent)" }}
          >
            {(["top", "new"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="rounded-full px-4 py-1.5 text-[12.5px] font-bold uppercase tracking-wider transition-all"
                style={{
                  background: activeTab === t ? "var(--butter)" : "transparent",
                  color: "var(--ink)",
                }}
              >
                {t === "top" ? "Top Chatbots" : "New Chatbots"}
              </button>
            ))}
          </div>
        </div>

        {/* Featured bot cards */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          {featured.slice(activeTab === "top" ? 0 : 3, activeTab === "top" ? 3 : 6).map((b) => (
            <BotFeatureCard key={b.id} bot={b} />
          ))}
        </div>
      </section>

      {/* All Chatbots list */}
      <section className="mx-3 mt-4 rounded-[2rem] px-4 pb-6 pt-5" style={{ background: "var(--cream)", color: "var(--ink)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[1.4rem] tracking-tight">All Chatbots</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklab, var(--ink) 8%, transparent)" }}
            aria-label="Filter"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Category chips */}
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(Object.keys(CATEGORY_LABELS) as BotCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all"
              style={{
                background: activeCategory === c ? "var(--ink)" : "color-mix(in oklab, var(--ink) 6%, transparent)",
                color: activeCategory === c ? "var(--butter)" : "var(--ink)",
              }}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="mt-4 space-y-2.5">
          {filtered.map((b) => (
            <BotListRow key={b.id} bot={b} />
          ))}

          <Link
            to="/bots/new"
            className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-3.5 text-[13.5px] font-semibold"
            style={{ borderColor: "color-mix(in oklab, var(--ink) 20%, transparent)", color: "var(--ink)" }}
          >
            <Plus className="h-4 w-4" /> Create your own bot
          </Link>
        </div>
      </section>

      <SettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        update={update}
        isProEffective={!!user}
        usage={usage}
        onUpgrade={() => setSettingsOpen(false)}
        onClearConversation={() => setSettingsOpen(false)}
        onSelectLanguage={(code) => update({ language: code })}
      />
    </main>
  );
}


function BotFeatureCard({ bot }: { bot: Bot }) {
  return (
    <Link
      to="/chat/$botId"
      params={{ botId: bot.id }}
      className="animate-tile-in flex flex-col overflow-hidden rounded-3xl border p-3 transition-all active:scale-[0.98]"
      style={{
        background: "#fff",
        borderColor: "color-mix(in oklab, var(--ink) 10%, transparent)",
      }}
    >
      <div className="relative mx-auto">
        <BotAvatar bot={bot} size={68} eager />
        {bot.tier === "pro" ? null : (
          <span
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
            style={{ background: "#22c55e", color: "white" }}
            aria-label="Verified"
          >
            ✓
          </span>
        )}
      </div>
      <div className="mt-2 text-center">
        <div className="text-[13.5px] font-bold">{bot.name}</div>
        <div className="text-[11px] opacity-60">{bot.tagline}</div>
      </div>
      <div
        className="mt-3 flex items-center justify-between rounded-2xl px-3 py-1.5"
        style={{ background: "var(--ink)", color: "var(--cream)" }}
      >
        <span className="flex items-center gap-1 text-[11px] font-semibold">
          <Star className="h-3 w-3 fill-current" style={{ color: "var(--butter)" }} />
          {bot.rating.toFixed(1)}
        </span>
        <span className="text-[11px] font-bold">{bot.price}</span>
      </div>
    </Link>
  );
}

function BotListRow({ bot }: { bot: Bot }) {
  const isVoice = bot.id === "news-ani";
  return (
    <Link
      to="/chat/$botId"
      params={{ botId: bot.id }}
      className="flex items-center gap-3 rounded-2xl border p-2.5 transition-all active:scale-[0.99]"
      style={{ background: "#fff", borderColor: "color-mix(in oklab, var(--ink) 10%, transparent)" }}
    >
      <BotAvatar bot={bot} size={44} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-bold">{bot.name}</div>
        <div className="truncate text-[11.5px] opacity-60">{bot.tagline}</div>
      </div>
      <div className="flex flex-col items-end gap-1">
        {bot.tier === "pro" && bot.price !== "Unlocked" ? (
          <span
            className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{ background: "var(--lavender)", color: "var(--ink)" }}
          >
            {bot.price}
          </span>
        ) : bot.price === "Unlocked" ? (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{ background: "color-mix(in oklab, var(--ink) 8%, transparent)" }}
          >
            {isVoice ? "🔊" : "🔓"} Unlocked
          </span>
        ) : (
          <span className="flex items-center gap-0.5 text-[10.5px] font-bold">
            <Star className="h-2.5 w-2.5 fill-current" style={{ color: "#f5b942" }} />
            {bot.rating}
          </span>
        )}
      </div>
    </Link>
  );
}
