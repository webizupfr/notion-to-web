import { Text } from "@/components/ui/Text";

export function NotionUnknown({ type }: { type: string }) {
  return (
    <div className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-[var(--space-4)] py-[var(--space-3)]">
      <Text variant="small" className="text-[var(--muted)]">
        Unsupported Notion block: <code>{type}</code>
      </Text>
    </div>
  );
}
