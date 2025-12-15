import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type TextVariants = "body" | "muted" | "lead" | "small";

type TextProps<T extends ElementType = "p"> = {
  as?: T;
  variant?: TextVariants;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

const variantStyles: Record<TextVariants, string> = {
  body: "text-[1.125rem] leading-[1.6]",
  muted: "text-[color:var(--muted)] text-[1.125rem] leading-[1.6]",
  lead: "text-[1.12rem] leading-[1.7] tracking-[-0.005em]",
  small: "text-[0.95rem] leading-[1.5]",
};

export function Text<T extends ElementType = "p">({
  as,
  variant = "body",
  className,
  children,
  ...rest
}: TextProps<T>) {
  const Component = (as ?? "p") as ElementType;
  const cx = (...parts: Array<string | false | null | undefined>) =>
    parts.filter(Boolean).join(" ");

  return (
    <Component
      className={cx(
        "font-sans text-[color:var(--fg)]",
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
