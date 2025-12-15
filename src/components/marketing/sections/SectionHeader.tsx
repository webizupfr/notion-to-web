import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

type SectionHeaderProps = {
  eyebrow?: string | null;
  title?: string | null;
  lead?: string | null;
};

export function SectionHeader({ eyebrow, title, lead }: SectionHeaderProps) {
  if (!eyebrow && !title && !lead) return null;
  return (
    <div className="marketing-heading">
      {eyebrow ? (
        <div className="marketing-heading__eyebrow">
          <span className="marketing-eyebrow-pill">{eyebrow}</span>
          <span className="marketing-heading__dash" aria-hidden />
        </div>
      ) : null}
      {title ? (
        <Heading
          level={2}
          className="marketing-heading__title text-current"
        >
          {title}
        </Heading>
      ) : null}
      {lead ? (
        <Text variant="lead" className="marketing-heading__lead">
          {lead}
        </Text>
      ) : null}
    </div>
  );
}
