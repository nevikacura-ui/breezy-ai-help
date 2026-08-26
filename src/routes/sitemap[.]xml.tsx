import { createFileRoute } from "@tanstack/react-router";

const ORIGIN = "https://askeasy.ai";

const PAGES: Array<{ path: string; priority: string; changefreq: string }> = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/bots", priority: "0.9", changefreq: "weekly" },
  { path: "/onboarding", priority: "0.5", changefreq: "monthly" },
  { path: "/auth", priority: "0.4", changefreq: "monthly" },
  { path: "/legal/privacy", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/terms", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/refunds", priority: "0.4", changefreq: "yearly" },
  { path: "/legal/contact", priority: "0.4", changefreq: "yearly" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        // No <lastmod>: we have no authoritative per-page change timestamp,
        // and a generation-time date would be misleading to crawlers.
        const urls = PAGES.map(
          (p) =>
            `  <url><loc>${ORIGIN}${p.path}</loc><changefreq>${p.changefreq}</changefreq><priority>${p.priority}</priority></url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
