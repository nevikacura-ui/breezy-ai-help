import { useEffect, useState } from "react";
import type { Bot } from "@/lib/bots";

// In-memory decode cache: once an avatar URL has decoded in this session,
// subsequent mounts skip the skeleton and render instantly.
const decoded = new Set<string>();
const inflight = new Map<string, Promise<void>>();

function accentBg(accent: Bot["accent"]): string {
  switch (accent) {
    case "butter":   return "linear-gradient(135deg,#ffe58a,#ffc107)";
    case "lavender": return "linear-gradient(135deg,#dfc4ee,#b487d3)";
    case "pink":     return "linear-gradient(135deg,#ffd6e0,#ff9ec4)";
    case "mint":     return "linear-gradient(135deg,#c6f0d5,#7ecfa1)";
    case "ink":      return "linear-gradient(135deg,#2a2a2e,#0f0f10)";
    default:         return "linear-gradient(135deg,#fff6dd,#f2e2b4)";
  }
}

/** Warm the browser cache + decode pipeline for a set of avatar URLs. */
export function preloadBotAvatars(urls: Array<string | undefined>) {
  if (typeof window === "undefined") return;
  for (const url of urls) {
    if (!url || decoded.has(url) || inflight.has(url)) continue;
    const img = new Image();
    img.decoding = "async";
    (img as HTMLImageElement & { fetchPriority?: string }).fetchPriority = "low";
    const p = new Promise<void>((resolve) => {
      img.onload = () => {
        const done = () => { decoded.add(url); inflight.delete(url); resolve(); };
        if (img.decode) img.decode().then(done, done);
        else done();
      };
      img.onerror = () => { inflight.delete(url); resolve(); };
    });
    img.src = url;
    inflight.set(url, p);
  }
}

export function BotAvatar({
  bot,
  size = 48,
  eager = false,
  emojiSize,
}: {
  bot: Bot;
  size?: number;
  eager?: boolean;
  emojiSize?: number;
}) {
  const url = bot.avatar;
  const [ready, setReady] = useState(() => !url || decoded.has(url));

  useEffect(() => {
    if (!url || ready) return;
    let cancelled = false;
    const existing = inflight.get(url);
    const settle = () => { if (!cancelled) setReady(true); };
    if (existing) {
      existing.then(settle);
    } else {
      preloadBotAvatars([url]);
      inflight.get(url)?.then(settle);
    }
    return () => { cancelled = true; };
  }, [url, ready]);

  return (
    <div
      className="relative flex items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, background: accentBg(bot.accent) }}
    >
      {/* Skeleton shimmer while decoding */}
      {url && !ready ? (
        <span
          aria-hidden
          className="absolute inset-0 animate-shimmer"
          style={{
            background:
              "linear-gradient(100deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%)",
            backgroundSize: "200% 100%",
          }}
        />
      ) : null}

      {url ? (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          decoding="async"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          onLoad={() => { decoded.add(url); setReady(true); }}
          className="h-full w-full object-cover transition-opacity duration-300"
          style={{ opacity: ready ? 1 : 0 }}
        />
      ) : (
        <span className="leading-none" style={{ fontSize: emojiSize ?? Math.round(size * 0.46) }} aria-hidden>
          {bot.emoji ?? "🤖"}
        </span>
      )}
    </div>
  );
}
