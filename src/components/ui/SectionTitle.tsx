import type { ReactNode } from "react";

type SectionTitleProps = {
  children: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  as?: "h2" | "h3";
};

const stylesByLevel: Record<Required<SectionTitleProps>["as"], string> = {
  h2: "font-display text-[1.9rem] font-semibold leading-[1.22] tracking-[-0.015em] text-slate-900",
  h3: "font-display text-[1.45rem] font-semibold leading-[1.3] tracking-[-0.01em] text-slate-900",
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

