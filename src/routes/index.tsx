import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOnboarding } from "@/lib/bots";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Askeasy — Your cute AI agent" },
      { name: "description", content: "AskEasy is your personal AI agent: helpful, cute, and always ready to get things done in your language." },
      { property: "og:title", content: "Askeasy — Your cute AI agent" },
      { property: "og:description", content: "AskEasy is your personal AI agent: helpful, cute, and always ready to get things done in your language." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://askeasy.ai/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://askeasy.ai/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AskEasy",
          url: "https://askeasy.ai/",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description:
            "AskEasy is a calm, beautifully simple AI assistant. Ask anything by text, voice, camera or documents — in 10 languages.",
          offers: [
            { "@type": "Offer", price: "0", priceCurrency: "INR", name: "Free" },
            { "@type": "Offer", price: "499", priceCurrency: "INR", name: "Pro (monthly)" },
          ],
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const nav = useNavigate();
  const { state, hydrated } = useOnboarding();

  useEffect(() => {
    if (!hydrated) return;
    if (!state.seenSplash) nav({ to: "/splash", replace: true });
    else if (!state.completed) nav({ to: "/onboarding", replace: true });
    else nav({ to: "/bots", replace: true });
  }, [hydrated, state, nav]);

  return (
    <div className="flex min-h-dvh items-center justify-center" style={{ background: "var(--ink)", color: "var(--cream)" }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-50" />
    </div>
  );
}
