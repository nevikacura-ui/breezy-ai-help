import { cn } from "@/lib/utils";
import { COOKIE_SETTINGS_EVENT } from "./CookieConsent";

export function DivisionFooter({ tone = "default", className }: { tone?: "default" | "ink"; className?: string }) {
  return (
    <footer
      className={cn(
        "space-y-2 border-t px-4 py-6 text-center text-[11px] leading-relaxed",
        tone === "ink" ? "border-cream/10 text-cream/60" : "border-border/60 text-muted-foreground",
        className,
      )}
    >
      <p className={cn("font-medium", tone === "ink" ? "text-cream/80" : "text-foreground/80")}>
        A product of Consumer AI Studio (Almost Company - An Xceln Company) (A Division of Nevika Innovations Pvt Ltd)
      </p>
      <p>Nevika Innovations Private Limited, Mumbai, India.</p>
      <p>
        Support: <a className="underline underline-offset-2" href="mailto:info@nevika.ai">info@nevika.ai</a>
        <span aria-hidden="true"> · </span>
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}
        >
          Cookie settings
        </button>
      </p>
      <p>All trademarks, brand names, logos and associated intellectual property are the property of Nevika Innovations Pvt Ltd.</p>
    </footer>
  );
}
