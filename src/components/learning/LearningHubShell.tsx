import type { ReactNode } from "react";

import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type LearningHubShellProps = {
  title: string;
  subtitle?: string | null;
  mode: "hub" | "sprint";
  eyebrow?: string | null;
  children: ReactNode;
};

export function LearningHubShell({ title, subtitle, mode, eyebrow, children }: LearningHubShellProps) {
  const pillLabel = mode === "hub" ? "Parcours individuel" : "Sprint / Hackathon";

  return (
    <PageSection variant="content">
      <div className="space-y-[var(--space-l)]">
        <header className="space-y-[var(--space-s)]">
          <div className="flex items-center gap-[var(--space-s)]">
            <span className="pill">{pillLabel}</span>
            {eyebrow ? (
              <Text variant="small" className="uppercase tracking-[0.16em] text-[color:var(--muted)]">
                {eyebrow}
              </Text>
            ) : null}
          </div>
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
