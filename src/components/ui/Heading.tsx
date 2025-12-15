import type { ReactNode, CSSProperties } from "react";

import { Eyebrow } from "./Eyebrow";

type HeadingProps = {
  level?: 1 | 2 | 3;
  eyebrow?: ReactNode;
  description?: ReactNode;
  id?: string;
  className?: string;
  children: ReactNode;
};

const weightStyles: Record<NonNullable<HeadingProps["level"]>, string> = {
  1: "font-bold",
  2: "font-semibold",
  3: "font-semibold",
};

const sizeStyles: Record<NonNullable<HeadingProps["level"]>, CSSProperties> = {
  1: {
    fontSize: "clamp(1.9rem, 2.8vw, 2.3rem)",
    lineHeight: 1.1,
    letterSpacing: "-0.03em",
  },
  2: {
    fontSize: "clamp(1.55rem, 2.2vw, 1.95rem)",
    lineHeight: 1.14,
    letterSpacing: "-0.02em",
  },
  3: {
    fontSize: "clamp(1.2rem, 1.8vw, 1.4rem)",
    lineHeight: 1.18,
    letterSpacing: "-0.01em",
  },
};

export function Heading({
  level = 2,
  eyebrow,
  description,
  id,
  className,
  children,
}: HeadingProps) {
  const Tag = `h${level}` as const;
  const cx = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(" ");

  return (
    <header className="space-y-[var(--space-xs)]">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <Tag
        id={id}
        className={cx(
          "font-display text-[color:var(--fg)]",
          weightStyles[level],
          className,
        )}
        style={sizeStyles[level]}
      >
        {children}
      </Tag>
      {description && (
        <p className="font-sans text-[color:var(--muted)] text-[0.95rem] leading-[1.55]">
          {description}
        </p>
      )}
    </header>
  );
}
