import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageSquare, Bot, User, Settings2 } from "lucide-react";

type Item = { to: string; label: string; icon: React.ReactNode };

const ITEMS: Item[] = [
  { to: "/bots", label: "Home", icon: <Home className="h-5 w-5" /> },
  { to: "/bots?tab=all", label: "Explore", icon: <MessageSquare className="h-5 w-5" /> },
  { to: "/bots/new", label: "New Bot", icon: <Bot className="h-5 w-5" /> },
  { to: "/account", label: "Me", icon: <User className="h-5 w-5" /> },
  { to: "/settings", label: "Settings", icon: <Settings2 className="h-5 w-5" /> },
];

export function BottomNav({ onSettings }: { onSettings?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      className="fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(22rem,calc(100vw-2rem))] items-center justify-between rounded-full px-3 py-2.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.55)]"
      style={{ background: "var(--ink)", color: "var(--cream)" }}
    >
      {ITEMS.map((item, i) => {
        const active = i === 0 && (pathname === "/bots" || pathname.startsWith("/chat"));
        const isSettings = item.to === "/settings";
        const content = (
          <span
            className={
              "flex h-11 w-11 items-center justify-center rounded-full transition-all " +
              (active ? "scale-105" : "opacity-70 hover:opacity-100")
            }
            style={active ? { background: "var(--butter)", color: "var(--ink)" } : undefined}
          >
            {item.icon}
          </span>
        );
        if (isSettings && onSettings) {
          return (
            <button key={item.to} onClick={onSettings} aria-label={item.label}>
              {content}
            </button>
          );
        }
        return (
          <Link key={item.to} to={item.to.split("?")[0]} aria-label={item.label}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
