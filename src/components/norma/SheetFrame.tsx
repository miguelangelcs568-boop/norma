import type { ReactNode } from "react";

export function SheetFrame({
  kicker,
  title,
  meta,
  children,
}: {
  kicker: string;
  title: string;
  meta: string;
  children: ReactNode;
}) {
  return (
    <article className="relative mx-auto w-full max-w-3xl border border-line bg-sheet text-ink">
      <span className="absolute top-2 left-3 font-mono text-sm text-accent" aria-hidden>
        +
      </span>
      <span className="absolute top-2 right-3 font-mono text-sm text-accent" aria-hidden>
        +
      </span>
      <span className="absolute bottom-2 left-3 font-mono text-sm text-accent" aria-hidden>
        +
      </span>
      <span className="absolute right-3 bottom-2 font-mono text-sm text-accent" aria-hidden>
        +
      </span>
      <div className="flex items-center justify-center gap-8 border-b border-line py-3" aria-hidden>
        <span className="size-4 rounded-full border-2 border-ink" />
        <span className="size-4 rounded-full border-2 border-ink" />
        <span className="size-4 rounded-full border-2 border-ink" />
      </div>
      <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
        <div className="min-w-0">
          <p className="font-mono text-xs tracking-widest text-muted uppercase">{kicker}</p>
          <h2 className="font-sans text-3xl leading-tight">{title}</h2>
        </div>
        <p className="max-w-40 shrink-0 text-right font-mono text-xs text-muted">{meta}</p>
      </header>
      <div className="px-5 pb-5">{children}</div>
      <footer className="flex items-center justify-between border-t border-line px-5 py-2 font-mono text-xs text-muted">
        <span>Derivado de números</span>
        <span className="tabular-nums">0 créditos</span>
      </footer>
    </article>
  );
}
