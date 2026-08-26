import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { trackLegalLinkClick, type LegalDocId } from "@/lib/analytics";

export const Route = createFileRoute("/legal")({
  component: LegalLayout,
});

const TABS = [
  { to: "/legal/privacy", label: "Privacy" },
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/refunds", label: "Refunds" },
  { to: "/legal/contact", label: "Contact" },
] as const;

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
      <footer className="border-t border-border/60 py-8 text-center text-[12px] text-muted-foreground">
        © {new Date().getFullYear()} AskEasy · askeasy.ai
      </footer>
    </div>
  );
}
