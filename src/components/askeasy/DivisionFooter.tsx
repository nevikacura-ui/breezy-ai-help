import { Boxes, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { COOKIE_SETTINGS_EVENT } from "./CookieConsent";

export function DivisionFooter({ tone = "default", className }: { tone?: "default" | "ink"; className?: string }) {
  return (
    <footer
      className={cn(
        "space-y-3 border-t px-4 py-6 text-center text-[11px] leading-relaxed",
        tone === "ink" ? "border-cream/10 text-cream/60" : "border-border/60 text-muted-foreground",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <a
          href="https://www.puviobox.com"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-colors",
            tone === "ink" ? "border-cream/15 text-cream/80 hover:bg-cream/5" : "border-border/60 bg-background/60 text-foreground/75 hover:bg-accent/60",
          )}
        >
          <Boxes className="h-3.5 w-3.5" /> Explore on Puvio Box
        </a>
        <a
          href="https://truverify.ai"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-medium transition-colors",
            tone === "ink" ? "border-cream/15 text-cream/80 hover:bg-cream/5" : "border-border/60 bg-background/60 text-foreground/75 hover:bg-accent/60",
          )}
        >
          <ShieldCheck className="h-3.5 w-3.5" /> Security Verified by Truverify AI
        </a>
      </div>
      <div className="space-y-2">
        <p className={cn("font-medium", tone === "ink" ? "text-cream/80" : "text-foreground/80")}>
          A product of Consumer AI Studio (Almost Company - An Xceln Company) (A Division of Nevika Innovations Pvt Ltd)
        </p>
        <p>Nevika Innovations Private Limited, Mumbai, India.</p>
        <p>
          Support: <a className="underline underline-offset-2" href="mailto:info@nevika.ai">info@nevika.ai</a>
          <span aria-hidden="true"> · </span>
          <button type="button" className="underline underline-offset-2" onClick={() => window.dispatchEvent(new Event(COOKIE_SETTINGS_EVENT))}>
            Cookie settings
          </button>
        </p>
        <p>All trademarks, brand names, logos and associated intellectual property are the property of Nevika Innovations Pvt Ltd.</p>
      </div>
    </footer>
  );
}
