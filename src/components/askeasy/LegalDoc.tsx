import type { ReactNode } from "react";

export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="space-y-5">
      <header className="space-y-1.5">
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-[12.5px] text-muted-foreground">Last updated: {updated}</p>
      </header>
      <div className="space-y-5 text-[14.5px] leading-relaxed text-foreground/85 [&_a]:underline [&_h2]:mt-7 [&_h2]:text-[15.5px] [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
        {children}
      </div>
    </article>
  );
}
