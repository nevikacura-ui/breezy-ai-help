import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Grid3x3, SlidersHorizontal, Star, Plus, Sparkles } from "lucide-react";
import {
  PRESET_BOTS,
  CATEGORY_LABELS,
  useCustomBots,
  useOnboarding,
  type Bot,
  type BotCategory,
} from "@/lib/bots";
import { BottomNav } from "@/components/askeasy/BottomNav";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { useAuthUser, useSettings, useUsage } from "@/lib/askeasy";
import mascot from "@/assets/bots/mascot.png";

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

  return (
    <main
      className="relative min-h-dvh overflow-x-hidden pb-28"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Categories"
        >
          <Grid3x3 className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4" style={{ color: "var(--butter)" }} />
          <span className="font-display text-[1.1rem] tracking-tight">Chation</span>
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
            <div className="text-[15px] font-semibold leading-tight">AI Chat bots on subscription</div>
            <button
              className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider"
              style={{ background: "var(--lavender)", color: "var(--ink)" }}
            >
              Unlock $25/year
            </button>
          </div>
          <img src={mascot} alt="Mascot" className="h-24 w-24 object-contain" width={192} height={192} loading="lazy" />
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

      <BottomNav onSettings={() => setSettingsOpen(true)} />

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

function BotAvatar({ bot, size = 48 }: { bot: Bot; size?: number }) {
  const bg =
    bot.accent === "butter"
      ? "linear-gradient(135deg,#ffe58a,#ffc107)"
      : bot.accent === "lavender"
        ? "linear-gradient(135deg,#dfc4ee,#b487d3)"
        : bot.accent === "pink"
          ? "linear-gradient(135deg,#ffd6e0,#ff9ec4)"
          : bot.accent === "mint"
            ? "linear-gradient(135deg,#c6f0d5,#7ecfa1)"
            : bot.accent === "ink"
              ? "linear-gradient(135deg,#2a2a2e,#0f0f10)"
              : "linear-gradient(135deg,#fff6dd,#f2e2b4)";
  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: bg }}
    >
      {bot.avatar ? (
        <img src={bot.avatar} alt="" className="h-full w-full object-cover" width={size} height={size} loading="lazy" />
      ) : (
        <span className="text-[22px]" aria-hidden>{bot.emoji ?? "🤖"}</span>
      )}
    </div>
  );
}

function BotFeatureCard({ bot }: { bot: Bot }) {
  return (
    <Link
      to="/bots/$botId"
      params={{ botId: bot.id }}
      className="animate-tile-in flex flex-col overflow-hidden rounded-3xl border p-3 transition-all active:scale-[0.98]"
      style={{
        background: "#fff",
        borderColor: "color-mix(in oklab, var(--ink) 10%, transparent)",
      }}
    >
      <div className="relative mx-auto">
        <BotAvatar bot={bot} size={68} />
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
      to="/bots/$botId"
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
