import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type MetaItem = { label: string; value: string };

type LearningHubCardProps = {
  title: string;
  description?: string | null;
  mode: "hub" | "sprint";
  href: string;
  meta?: MetaItem[];
};

const pillLabel: Record<LearningHubCardProps["mode"], string> = {
  hub: "Parcours individuel",
  sprint: "Sprint / Hackathon",
};

export function LearningHubCard({ title, description, mode, href, meta }: LearningHubCardProps) {
  return (
    <Link
      href={href}
      className="surface-card block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]"
    >
      <div className="flex flex-col gap-[var(--space-s)]">
        <span className="pill w-fit">{pillLabel[mode]}</span>
        <Heading level={3}>{title}</Heading>
        {description ? <Text variant="muted">{description}</Text> : null}
        {meta?.length ? (
          <Text variant="small" className="text-[color:var(--muted)]">
            {meta.map((item, idx) => (
              <span key={`${item.label}-${item.value}`}>
                {item.label}: {item.value}
                {idx < meta.length - 1 ? " · " : ""}
              </span>
            ))}
          </Text>
        ) : null}
      </div>
    </Link>
  );
}
