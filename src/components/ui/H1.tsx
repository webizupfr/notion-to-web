import type { ReactNode } from "react";

type H1Props = {
  children: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
};

/**
 * Premium heading level 1. Supports an optional eyebrow (kicker)
 * and description. Encapsulates the desired spacing/typography
 * so Blocks.tsx stays light.
 */
export function H1({ children, eyebrow, description }: H1Props) {
  return (
    <header className="space-y-3">
      {eyebrow ? (
        <span className="eyebrow text-xs font-semibold uppercase tracking-[0.22em] text-muted">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-display text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.02em] text-[var(--foreground)]">
        {children}
      </h1>
      {description ? (
        <p className="max-w-2xl text-[1.05rem] leading-[1.6] text-muted-soft">{description}</p>
      ) : null}
    </header>
  );
}
