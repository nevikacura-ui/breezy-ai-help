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
      { name: "twitter:card", content: "summary_large_image" },
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
