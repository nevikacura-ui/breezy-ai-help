import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureThreadForBot } from "@/lib/threads";

export const Route = createFileRoute("/chat/$botId")({
  beforeLoad: ({ params }) => {
    if (typeof window === "undefined") return;
    const { active } = ensureThreadForBot(params.botId);
    throw redirect({ to: "/chat/$botId/$threadId", params: { botId: params.botId, threadId: active.id } });
  },
  component: () => null,
});
