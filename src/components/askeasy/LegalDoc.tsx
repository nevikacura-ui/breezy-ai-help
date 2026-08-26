import type { ReactNode } from "react";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Shared shell for every legal document.
 * `updated` is an ISO date (YYYY-MM-DD) so the rendered date and the
 * machine-readable <time> stay in sync across all legal pages.
 */
export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  const formatted = DATE_FMT.format(new Date(`${updated}T00:00:00Z`));

  return (
    <article className="space-y-5">
      <header className="space-y-1.5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-[12.5px] text-muted-foreground">
          Last updated: <time dateTime={updated}>{formatted}</time>
        </p>
      </header>
      <div className="space-y-5 text-[14.5px] leading-relaxed text-foreground/85 [&_a]:underline [&_h2]:mt-7 [&_h2]:text-[15.5px] [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
