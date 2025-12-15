import type { ReactNode } from "react";

import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type ChallengeShellProps = {
  title: string;
  subtitle?: string | null;
  eyebrow?: string | null;
  children: ReactNode;
  size?: "narrow" | "wide" | "fluid";
};

export function ChallengeShell({ title, subtitle, eyebrow, children, size = "wide" }: ChallengeShellProps) {
  return (
    <PageSection variant="content" size={size}>
      <div className="space-y-[var(--space-l)]">
        <header className="space-y-[var(--space-s)]">
          {eyebrow ? <Text variant="small" className="uppercase tracking-[0.16em] text-[color:var(--muted)]">{eyebrow}</Text> : null}
          <Heading level={1}>{title}</Heading>
          {subtitle ? (
            <Text variant="lead" className="max-w-[72ch]">
              {subtitle}
            </Text>
          ) : null}
        </header>
        <div className="space-y-[var(--space-l)]">{children}</div>
      </div>
    </PageSection>
  );
}
