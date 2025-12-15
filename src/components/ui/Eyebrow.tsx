import type { ReactNode } from "react";

type EyebrowProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Uppercased micro-label to contextualize a section or heading.
 */
export function Eyebrow({ children, className }: EyebrowProps) {
  const cx = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(" ");

  return (
    <span
      className={cx(
        "font-sans text-[0.78rem] uppercase tracking-[0.16em] text-[color:var(--muted)]",
        className,
      )}
    >
      {children}
    </span>
  );
}
