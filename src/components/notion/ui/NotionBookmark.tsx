import { Text } from "@/components/ui/Text";

type Props = {
  url: string;
  title?: string | null;
  description?: string | null;
  image?: string | null;
};

function hostname(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function NotionBookmark({ url, title, description, image }: Props) {
  const host = hostname(url);
  return (
    <a
      href={url}
      className="surface-card block transition hover:-translate-y-[1px]"
      rel="noreferrer"
      target="_blank"
    >
      <div className="flex items-start gap-[var(--space-m)]">
        {image ? (
          <div className="h-16 w-24 overflow-hidden rounded-[var(--r-m)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={title ?? host} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary-soft)_35%,var(--bg))] text-sm font-semibold text-[var(--fg)]/80">
            {host.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="space-y-[var(--space-xs)]">
          <Text className="text-[1.02rem] font-semibold leading-[1.4]">{title ?? url}</Text>
          {description ? (
            <Text variant="muted" className="text-[0.95rem] leading-[1.55]">
              {description}
            </Text>
          ) : null}
          <div className="flex items-center gap-2">
            <Text variant="small" className="text-[var(--muted)]">
              {host}
            </Text>
          </div>
        </div>
      </div>
    </a>
  );
}
