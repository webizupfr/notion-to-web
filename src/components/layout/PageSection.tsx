import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Container } from "@/components/layout/Container";

type Variant = "marketing" | "content" | "blog";

type PageSectionProps = {
  children: ReactNode;
  variant?: Variant;
  className?: string;
  tone?: "default" | "alt";
  size?: "narrow" | "balanced" | "wide" | "fluid";
  innerPadding?: boolean;
  paddingY?: "tight" | "normal" | "loose";
  /**
   * Wrap content in a max-width container (72ch) for long-form text.
   */
  constrain?: boolean;
} & Omit<ComponentPropsWithoutRef<"section">, "children" | "className">;

const shells: Record<Variant, string> = {
  marketing: "bg-[color-mix(in_oklab,var(--bg)_92%,#fff)] border border-[color:var(--border)] rounded-[var(--r-xl)] shadow-[var(--shadow-subtle)]",
  blog: "bg-[color-mix(in_oklab,var(--bg)_96%,#fff)] border border-[color:var(--border)] rounded-[var(--r-lg)] shadow-[var(--shadow-subtle)]",
  content: "",
};

export function PageSection({
  children,
  variant = "content",
  className,
  tone = "default",
  size = "narrow",
  innerPadding = true,
  paddingY = "normal",
  constrain = false,
  ...rest
}: PageSectionProps) {
  const paddingMap: Record<NonNullable<PageSectionProps["paddingY"]>, string> = {
    tight: "py-[var(--space-3)] sm:py-[var(--space-4)]",
    normal: "py-[var(--space-3)] sm:py-[var(--space-4)]",
    loose: "py-[var(--space-3)] sm:py-[var(--space-4)]",
  };
  const paddingClass = paddingMap[paddingY] ?? paddingMap.normal;

  const shell = shells[variant];
  const cx = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(" ");

  const inner = constrain ? <div className="max-w-[72ch] space-y-4">{children}</div> : children;

  return (
    <section
      className={cx(
        paddingClass,
        tone === "alt" ? "section-tone-alt" : "section-tone-default",
        className
      )}
      {...rest}
    >
      <Container size={size}>
        <div
          className={cx(
            "space-y-[var(--space-4)]",
            innerPadding && "px-[var(--space-5)] sm:px-[var(--space-6)]",
            shell
          )}
        >
          {inner}
        </div>
      </Container>
    </section>
  );
}
