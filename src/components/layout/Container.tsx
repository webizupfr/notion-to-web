import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: "narrow" | "wide" | "fluid";
};

export function Container({ children, className, size = "narrow" }: ContainerProps) {
  const maxBySize =
    size === "wide" ? "max-w-[1800px]" : size === "fluid" ? "max-w-none" : "max-w-5xl";
  const base = `mx-auto w-full ${maxBySize} px-6 sm:px-8`;
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
