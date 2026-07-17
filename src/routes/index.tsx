import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useOnboarding } from "@/lib/bots";

export const Route = createFileRoute("/")({ component: Index });

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
