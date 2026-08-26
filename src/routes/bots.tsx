import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Settings2, SlidersHorizontal, Star, Plus, X } from "lucide-react";
import {
  PRESET_BOTS,
  CATEGORY_LABELS,
  CATEGORY_CAPABILITY,
  AGENT_FAMILIES,
  FAMILY_LABELS,
  familyOf,
  useCustomBots,
  useOnboarding,
  type Bot,
  type BotCategory,
  type AgentFamily,
} from "@/lib/bots";
import { SettingsSheet } from "@/components/askeasy/SettingsSheet";
import { BotAvatar, preloadBotAvatars } from "@/components/askeasy/BotAvatar";
import { useAuthUser, useSettings, useUsage, PERSONAS, type Persona } from "@/lib/askeasy";
import easy from "@/assets/bots/easy.png";
import logoAsset from "@/assets/askeasy-logo-transparent.png.asset.json";

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
      { title: "Askeasy — Personalized AI agents" },
      { name: "description", content: "Browse a collection of personalized AI agents led by Easy, your cute AI companion. Cook, code, learn, plan, and get things done — pick your agent and start a conversation." },
      { property: "og:title", content: "Askeasy — Personalized AI agents" },
      { property: "og:description", content: "Browse a collection of personalized AI agents led by Easy, your cute AI companion." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://askeasy.ai/bots" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/bots" }],
  }),
  component: BotsHome,
});

function BotsHome() {
  const nav = useNavigate();
  const { state, hydrated } = useOnboarding();
  const { bots: customBots, addBot } = useCustomBots();
  const { settings, update } = useSettings();
  const { usage } = useUsage();
  const user = useAuthUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"top" | "new">("top");
  const [activeCategory, setActiveCategory] = useState<BotCategory>("all");
  const [activeFamily, setActiveFamily] = useState<AgentFamily>("pals");
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [preview, setPreview] = useState<Bot | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);


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

  // Redirect through splash if never seen. Navigation must run after render;
  // calling it in the render body makes TanStack's Transitioner update while
  // BotsHome is rendering and can leave the client on a blank transition.
  useEffect(() => {
    if (hydrated && !state.seenSplash) {
      void nav({ to: "/splash", replace: true });
    }
  }, [hydrated, state.seenSplash, nav]);

  const allBots = useMemo<Bot[]>(() => [...customBots, ...PRESET_BOTS], [customBots]);
  const featured = useMemo(() => PRESET_BOTS.filter((b) => b.featured), []);
  const filtered = useMemo(() => {
    const byFamily = allBots.filter((b) => familyOf(b) === activeFamily);
    if (activeCategory === "all") return byFamily;
    return byFamily.filter((b) => b.category === activeCategory);
  }, [allBots, activeCategory, activeFamily]);

  // Warm avatar decode cache once so the hub + chat feel instant.
  useEffect(() => {
    preloadBotAvatars(allBots.map((b) => b.avatar));
  }, [allBots]);

  return (
    <main
      className="relative min-h-dvh overflow-x-hidden pb-6"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Header — cream band matched to the logo artwork background */}
      <header
        className="relative flex items-center justify-between rounded-b-[2rem] px-4 pb-3 pt-4"
        style={{ background: "var(--logo-cream)", color: "var(--ink)" }}
      >
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          style={{ background: "color-mix(in oklab, var(--ink) 7%, transparent)" }}
          aria-label="Settings"
        >
          <Settings2 className="h-5 w-5" style={{ color: "var(--ink)" }} />
        </button>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <img
            src={logoAsset.url}
            alt="Askeasy"
            className="h-auto w-[220px] object-contain sm:w-[260px]"
            width={1200}
            height={400}
            loading="eager"
            decoding="async"
          />
        </div>

        <button
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95"
          style={{ background: "color-mix(in oklab, var(--ink) 7%, transparent)" }}
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" style={{ color: "var(--ink)" }} />
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
            <div className="text-[15px] font-semibold leading-tight">Your AI agents are ready</div>
            <p className="mt-1 text-[12px] opacity-70">Cute personal agents that help you get things done.</p>
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
            { label: "Custom\nAI Agents", emoji: "🤖" },
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
          <span className="text-[12px] font-semibold uppercase tracking-wider opacity-60">Unlock agents</span>
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
                {t === "top" ? "Top Agents" : "New Agents"}
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

      {/* All Agents list */}
      <section className="mx-3 mt-4 rounded-[2rem] px-4 pb-6 pt-5" style={{ background: "var(--cream)", color: "var(--ink)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[1.4rem] tracking-tight">All Agents</h2>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: "color-mix(in oklab, var(--ink) 8%, transparent)" }}
            aria-label="Filter"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Character family tabs */}
        <div className="mt-3 flex gap-1.5">
          {AGENT_FAMILIES.map((f) => {
            const on = activeFamily === f;
            return (
              <button
                key={f}
                onClick={() => setActiveFamily(f)}
                className="flex-1 rounded-2xl px-2 py-2.5 text-[12px] font-semibold transition-all"
                style={{
                  background: on ? "var(--ink)" : "color-mix(in oklab, var(--ink) 6%, transparent)",
                  color: on ? "var(--butter)" : "var(--ink)",
                }}
              >
                {FAMILY_LABELS[f]}
              </button>
            );
          })}
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

        {/* Clean card grid */}
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {filtered.map((b) => (
            <BotGridCard key={b.id} bot={b} onOpen={() => setPreview(b)} />
          ))}

          <button
            onClick={() => setUploadOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-3xl border-2 border-dashed p-3 text-center transition-all active:scale-[0.97]"
            style={{ borderColor: "color-mix(in oklab, var(--ink) 20%, transparent)", color: "var(--ink)", minHeight: 124 }}
          >
            <Plus className="h-5 w-5" />
            <span className="text-[11.5px] font-semibold leading-tight">Add character</span>
          </button>
        </div>

      </section>

      <BotPreviewModal bot={preview} onClose={() => setPreview(null)} />
      <UploadCharacterModal
        open={uploadOpen}
        family={activeFamily}
        onClose={() => setUploadOpen(false)}
        onCreate={(bot) => {
          addBot(bot);
          setUploadOpen(false);
          setActiveFamily(bot.family ?? "toons");
        }}
      />

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
        <div
          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: "color-mix(in oklab, var(--butter) 22%, transparent)", color: "var(--ink)" }}
        >
          {CATEGORY_CAPABILITY[bot.category]}
        </div>
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


/** Clean square character card — image + name only. */
function BotGridCard({ bot, onOpen }: { bot: Bot; onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="animate-tile-in flex flex-col items-center gap-2 rounded-3xl border p-3 transition-all active:scale-[0.97]"
      style={{ background: "#fff", borderColor: "color-mix(in oklab, var(--ink) 10%, transparent)", minHeight: 124 }}
    >
      <BotAvatar bot={bot} size={62} />
      <span className="line-clamp-2 text-[12px] font-bold leading-tight">{bot.name}</span>
    </button>
  );
}

/** Character preview → start a conversation immediately. */
function BotPreviewModal({ bot, onClose }: { bot: Bot | null; onClose: () => void }) {
  const nav = useNavigate();
  if (!bot) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${bot.name} preview`}
    >
      <div
        className="animate-tile-in w-full max-w-sm rounded-[2rem] p-6 text-center"
        style={{ background: "var(--cream)", color: "var(--ink)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center">
          <BotAvatar bot={bot} size={132} eager />
        </div>
        <h3 className="mt-4 font-display text-[1.5rem] leading-tight">{bot.name}</h3>
        <p className="mt-1 text-[13px] opacity-70">{bot.tagline}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider opacity-50">
          {FAMILY_LABELS[familyOf(bot)]} · {CATEGORY_CAPABILITY[bot.category]}
        </p>

        <button
          onClick={() => nav({ to: "/chat/$botId", params: { botId: bot.id } })}
          className="mt-5 w-full rounded-full py-3 text-[14px] font-bold"
          style={{ background: "var(--ink)", color: "var(--butter)" }}
        >
          Start new conversation
        </button>
        <button onClick={onClose} className="mt-2 w-full rounded-full py-2.5 text-[13px] font-semibold opacity-60">
          Close
        </button>
      </div>
    </div>
  );
}

/** Upload a character image and file it under a family tab. */
function UploadCharacterModal({
  open,
  family,
  onClose,
  onCreate,
}: {
  open: boolean;
  family: AgentFamily;
  onClose: () => void;
  onCreate: (bot: Bot) => void;
}) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [fam, setFam] = useState<AgentFamily>(family);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setFam(family); }, [family, open]);

  if (!open) return null;

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const url = await downscaleImage(file, 256);
      setImage(url);
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed || !image) return;
    onCreate({
      id: `custom-${Date.now().toString(36)}`,
      name: trimmed,
      tagline: tagline.trim() || "Your custom character",
      category: "friend",
      family: fam,
      rating: 5,
      price: "Free",
      tier: "free",
      avatar: image,
      accent: "lavender",
      systemPrompt: `You are ${trimmed} — ${tagline.trim() || "a friendly personal AI character"}. Stay in character, be warm, concise and helpful.`,
      greeting: `Hi, I'm ${trimmed}! What shall we do?`,
      instructions: [
        { title: "Ask anything", hint: "I'm here to help.", emoji: "✨" },
        { title: "Stay in character", hint: "I'll keep my personality.", emoji: "🎭" },
        { title: "Get things done", hint: "Plans, ideas, answers.", emoji: "🚀" },
      ],
      custom: true,
    });
    setName(""); setTagline(""); setImage(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add a character"
    >
      <div
        className="animate-tile-in w-full max-w-sm rounded-[2rem] p-6"
        style={{ background: "var(--cream)", color: "var(--ink)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-[1.35rem] leading-tight">Add a character</h3>

        <label className="mt-4 flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed p-4"
               style={{ borderColor: "color-mix(in oklab, var(--ink) 20%, transparent)" }}>
          {image ? (
            <img src={image} alt="" width={96} height={96} className="h-24 w-24 rounded-full object-cover" />
          ) : (
            <>
              <Plus className="h-5 w-5" />
              <span className="text-[12.5px] font-semibold">{busy ? "Processing…" : "Choose an image"}</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void pick(f); }}
          />
        </label>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Character name"
          className="mt-3 w-full rounded-2xl px-4 py-3 text-[14px] outline-none"
          style={{ background: "#fff", border: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)" }}
        />
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Short tagline (what they help with)"
          className="mt-2 w-full rounded-2xl px-4 py-3 text-[14px] outline-none"
          style={{ background: "#fff", border: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)" }}
        />

        <div className="mt-3 flex gap-1.5">
          {AGENT_FAMILIES.map((f) => (
            <button
              key={f}
              onClick={() => setFam(f)}
              className="flex-1 rounded-2xl px-2 py-2 text-[12px] font-semibold transition-all"
              style={{
                background: fam === f ? "var(--ink)" : "color-mix(in oklab, var(--ink) 6%, transparent)",
                color: fam === f ? "var(--butter)" : "var(--ink)",
              }}
            >
              {FAMILY_LABELS[f]}
            </button>
          ))}
        </div>

        <button
          onClick={create}
          disabled={!name.trim() || !image}
          className="mt-5 w-full rounded-full py-3 text-[14px] font-bold disabled:opacity-40"
          style={{ background: "var(--ink)", color: "var(--butter)" }}
        >
          Add character
        </button>
        <button onClick={onClose} className="mt-2 w-full rounded-full py-2.5 text-[13px] font-semibold opacity-60">
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Downscale an uploaded image to a square data URL so it fits in localStorage. */
async function downscaleImage(file: File, size: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const s = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, (bitmap.width - s) / 2, (bitmap.height - s) / 2, s, s, 0, 0, size, size);
  bitmap.close?.();
  return canvas.toDataURL("image/webp", 0.85);
}
