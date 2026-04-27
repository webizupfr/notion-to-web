import { Text } from "@/components/ui/Text";

/**
 * Bloc Notion non supporté (type inconnu de notre renderer ou bloc API "unsupported").
 *
 * En production : on rend `null` → l'user ne voit rien (pas de message d'erreur cassant
 * l'expérience). Un log côté serveur reste pour debug.
 *
 * En développement : on affiche une card visible pour que le développeur remarque
 * et puisse étendre le renderer si besoin.
 */
export function NotionUnknown({ type }: { type: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="rounded-[var(--r-m)] border border-dashed border-[color:var(--accent)] bg-[color:var(--accent-bg)] px-[var(--space-md)] py-[var(--space-sm)]">
      <Text variant="small" className="text-[color:var(--text-tertiary)]">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)]">
          [dev]
        </span>{" "}
        Bloc non supporté : <code className="font-mono">{type}</code>
      </Text>
    </div>
  );
}
