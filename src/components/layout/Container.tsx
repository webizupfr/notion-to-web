import type { ReactNode } from "react";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

export function Container({ children, className }: ContainerProps) {
  const base = "mx-auto w-full max-w-5xl px-6 sm:px-8";
  return <div className={className ? `${base} ${className}` : base}>{children}</div>;
}
