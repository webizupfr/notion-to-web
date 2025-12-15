import { Text } from "@/components/ui/Text";

type Props = {
  url: string;
  name?: string | null;
  caption?: string | null;
};

function extractFileName(url: string) {
  try {
    const clean = new URL(url);
    const pathname = clean.pathname.split("/").pop() || "";
    const decoded = decodeURIComponent(pathname);
    const base = decoded.split("?")[0].split("#")[0];
    return base || clean.hostname;
  } catch {
    const fallback = url.split("/").pop() ?? url;
    return fallback.split("?")[0].split("#")[0];
  }
}

export function NotionFile({ url, name, caption }: Props) {
  const label = name?.trim() || extractFileName(url) || "Télécharger le fichier";
  return (
    <div className="surface-panel inline-flex w-full items-center justify-between gap-[var(--space-m)] px-[var(--space-m)] py-[var(--space-s)]">
      <div className="flex items-center gap-[var(--space-s)]">
        <span className="text-xl" aria-hidden>📄</span>
        <div className="space-y-[2px]">
          <Text className="font-semibold leading-tight">{label}</Text>
          {caption ? (
            <Text variant="small" className="text-[color:var(--muted)] leading-tight">
              {caption}
            </Text>
          ) : null}
        </div>
      </div>
      <a
        href={url}
        className="btn btn-secondary btn-sm"
        rel="noreferrer"
        target="_blank"
        download
      >
        Télécharger
      </a>
    </div>
  );
}
