import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function MarketingShell({ children }: Props) {
  return <main className="marketing-page">{children}</main>;
}
