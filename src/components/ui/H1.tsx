import type { ReactNode } from "react";

import { Heading } from "./Heading";
import { Eyebrow } from "./Eyebrow";
import { Text } from "./Text";

type H1Props = {
  children: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
};

/**
 * Legacy wrapper for Heading level 1 with optional eyebrow/description.
 * Kept for backward compatibility; delegates to the new typography primitives.
 */
export function H1({ children, eyebrow, description }: H1Props) {
  return (
    <header className="space-y-3">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading level={1}>{children}</Heading>
      {description ? (
        <Text className="max-w-2xl text-[1.05rem] leading-[1.6] text-[color:var(--muted)]/85">
          {description}
        </Text>
      ) : null}
    </header>
  );
}
