import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: "narrow" | "balanced" | "wide" | "fluid";
};

export function Container({ children, className, size = "narrow" }: ContainerProps) {
  const maxBySize =
    size === "wide"
      ? "max-w-[1400px]"
      : size === "balanced"
        ? "max-w-5xl"
        : size === "fluid"
          ? "max-w-none"
          : "max-w-4xl";
  const base = `mx-auto w-full ${maxBySize} px-[var(--space-5)] sm:px-[var(--space-6)]`;
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
