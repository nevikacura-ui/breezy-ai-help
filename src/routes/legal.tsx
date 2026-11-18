import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { trackLegalLinkClick, type LegalDocId } from "@/lib/analytics";
import { DivisionFooter } from "@/components/askeasy/DivisionFooter";

export const Route = createFileRoute("/legal")({
  component: LegalLayout,
});

const TABS: Array<{ to: string; label: string; doc: LegalDocId }> = [
  { to: "/legal/privacy", label: "Privacy", doc: "privacy" },
  { to: "/legal/terms", label: "Terms", doc: "terms" },
  { to: "/legal/ai-usage", label: "AI Usage", doc: "ai-usage" },
  { to: "/legal/refunds", label: "Refunds", doc: "refunds" },
  { to: "/legal/cookies", label: "Cookies", doc: "cookies" },
  { to: "/legal/contact", label: "Contact", doc: "contact" },
];

function LegalLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3 px-5 py-4">
          <Link to="/" className="text-sm font-semibold tracking-tight">
            AskEasy
          </Link>
          <nav className="ml-auto flex flex-wrap gap-1.5">
            {TABS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                activeProps={{ className: "rounded-full px-3 py-1.5 text-[13px] bg-accent text-foreground font-medium" }}
                onClick={() => trackLegalLinkClick(t.doc, "legal_nav")}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Outlet />
      </main>
      <DivisionFooter />
      <p className="pb-6 text-center text-[11px] text-muted-foreground">© {new Date().getFullYear()} AskEasy · askeasy.ai</p>
    </div>
  );
}
