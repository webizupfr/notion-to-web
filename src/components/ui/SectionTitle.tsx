import type { ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  as?: "h2" | "h3";
};

const stylesByLevel: Record<Required<SectionTitleProps>["as"], string> = {
  h2: "font-display text-[1.85rem] font-semibold leading-[1.18] tracking-[-0.015em] text-[var(--foreground)]",
  h3: "font-display text-[1.4rem] font-semibold leading-[1.28] tracking-[-0.01em] text-[var(--foreground)]",
};

export function SectionTitle({ children, eyebrow, description, as = "h2" }: SectionTitleProps) {
  const HeadingTag = as;
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <span className="eyebrow text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          {eyebrow}
        </span>
      ) : null}
      <HeadingTag className={stylesByLevel[as]}>{children}</HeadingTag>
      {description ? (
        <p className="max-w-2xl text-[1rem] leading-[1.58] text-muted-soft">{description}</p>
      ) : null}
    </header>
  );
}
