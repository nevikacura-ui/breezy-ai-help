import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, MoreHorizontal, Star } from "lucide-react";
import { getBotById, PRESET_BOTS, useCustomBots } from "@/lib/bots";
import { BotAvatar } from "@/components/askeasy/BotAvatar";

export const Route = createFileRoute("/bots/$botId")({
  head: ({ params }) => {
    const bot = PRESET_BOTS.find((b) => b.id === params.botId);
    return {
      meta: [
        { title: bot ? `${bot.name} — Askeasy` : "Bot — Askeasy" },
        { name: "description", content: bot?.tagline ?? "Personalized AI chatbot" },
      ],
    };
  },
  component: BotDetail,
  notFoundComponent: () => (
    <div className="flex min-h-dvh items-center justify-center" style={{ background: "var(--ink)", color: "var(--cream)" }}>
      Bot not found. <Link to="/bots" className="ml-2 underline">Go back</Link>
    </div>
  ),
});

function BotDetail() {
  const { botId } = Route.useParams();
  const nav = useNavigate();
  const { bots: customBots } = useCustomBots();
  const bot = getBotById(botId, customBots);
  if (!bot) return null;

  const isPaid = bot.tier === "pro" || bot.tier === "trial";

  return (
    <main
      className="relative min-h-dvh overflow-hidden pb-32"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {/* Top nav */}
      <header className="flex items-center justify-between px-5 pt-6">
        <button
          onClick={() => nav({ to: "/bots" })}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-[1.05rem]">New Chat instructions</span>
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "color-mix(in oklab, var(--cream) 8%, transparent)" }}
          aria-label="More"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>

      {/* Card */}
      <section
        className="mx-3 mt-6 rounded-[2rem] px-6 pb-8 pt-8"
        style={{
          background: "linear-gradient(180deg, #fff 0%, #fff5f8 100%)",
          color: "var(--ink)",
        }}
      >
        {/* Notch effect */}
        <div className="mx-auto -mt-11 mb-4 h-1.5 w-16 rounded-full" style={{ background: "color-mix(in oklab, var(--ink) 25%, transparent)" }} />

        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div
              className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full"
              style={{
                background:
                  bot.accent === "butter" ? "linear-gradient(135deg,#ffe58a,#ffc107)"
                    : bot.accent === "lavender" ? "linear-gradient(135deg,#dfc4ee,#b487d3)"
                      : bot.accent === "pink" ? "linear-gradient(135deg,#ffd6e0,#ff9ec4)"
                        : bot.accent === "mint" ? "linear-gradient(135deg,#c6f0d5,#7ecfa1)"
                          : "linear-gradient(135deg,#fff6dd,#f2e2b4)",
              }}
            >
              {bot.avatar ? (
                <img src={bot.avatar} alt="" className="h-full w-full object-cover" width={96} height={96} />
              ) : (
                <span className="text-[40px]">{bot.emoji ?? "🤖"}</span>
              )}
            </div>
            <span
              className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
              style={{ background: "#22c55e", color: "white" }}
            >
              ✓
            </span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <h1 className="font-display text-[1.4rem] tracking-tight">{bot.name}</h1>
            <span className="flex items-center gap-0.5 text-[13px] font-bold">
              <Star className="h-3.5 w-3.5 fill-current" style={{ color: "#f5b942" }} />
              {bot.rating.toFixed(1)}
            </span>
          </div>

          {isPaid && (
            <span
              className="mt-3 rounded-full px-3 py-1.5 text-[12px] font-bold"
              style={{ background: "var(--lavender)", color: "var(--ink)" }}
            >
              {bot.tier === "trial" ? `Free 3-day trial · then ${bot.price}` : `${bot.price} (Free 30 min trial)`}
            </span>
          )}

          <p className="mt-3 text-[13.5px] opacity-60">{bot.tagline}</p>
        </div>

        {/* Instructions */}
        <div className="mt-6 space-y-2.5">
          {bot.instructions.map((ins, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl border bg-white p-3"
              style={{ borderColor: "color-mix(in oklab, var(--ink) 8%, transparent)" }}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">{i + 1}. {ins.title}</div>
                <div className="text-[11.5px] opacity-60">{ins.hint}</div>
              </div>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[15px]"
                style={{
                  background:
                    i === 0 ? "var(--lavender)"
                      : i === 1 ? "color-mix(in oklab, var(--lavender) 50%, white)"
                        : "var(--butter)",
                }}
              >
                {ins.emoji}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Continue */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-6 pb-6 pt-4"
        style={{ background: "linear-gradient(to top, var(--ink) 60%, transparent)" }}>
        <Link
          to="/chat/$botId"
          params={{ botId: bot.id }}
          className="flex h-14 w-full items-center justify-center rounded-full font-display text-[1.05rem] transition-all active:scale-[0.98]"
          style={{ background: "var(--ink)", color: "var(--cream)", border: "1px solid color-mix(in oklab, var(--cream) 15%, transparent)" }}
        >
          Continue
        </Link>
      </div>
    </main>
  );
}
