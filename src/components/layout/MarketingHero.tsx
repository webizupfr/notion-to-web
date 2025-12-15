import type { ReactNode } from "react";

import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type MarketingHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  kicker?: string;
  children?: ReactNode;
  size?: "narrow" | "wide" | "fluid";
};

export function MarketingHero({ eyebrow, title, subtitle, kicker, children, size = "narrow" }: MarketingHeroProps) {
  return (
    <PageSection variant="marketing" size={size}>
      <div className="surface-hero p-[var(--space-6)] sm:p-[var(--space-7)]">
        <div className="space-y-[var(--space-m)]">
          {kicker ? (
            <Text variant="small" className="text-[color:var(--muted)]">
              {kicker}
            </Text>
          ) : null}

          {eyebrow ? <span className="pill">{eyebrow}</span> : null}

          <div className="space-y-[var(--space-xs)]">
            <Heading level={1}>{title}</Heading>
            {subtitle ? (
              <Text variant="lead" className="max-w-[72ch]">
                {subtitle}
              </Text>
            ) : null}
          </div>

          {children ? <div className="flex flex-wrap items-center gap-[var(--space-l)]">{children}</div> : null}
        </div>
      </div>
    </PageSection>
  );
}
