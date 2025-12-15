import type { ReactNode } from "react";

import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

export function ErrorState({
  title = "Une erreur est survenue",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="surface-panel text-center space-y-[var(--space-s)]">
      <span className="text-[color:var(--danger)] text-lg" aria-hidden>
        ⚡
      </span>
      <Heading level={3}>{title}</Heading>
      {description ? <Text variant="muted">{description}</Text> : null}
      {action ? <div className="flex justify-center">{action}</div> : null}
    </section>
  );
}
