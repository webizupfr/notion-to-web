import { Text } from "@/components/ui/Text";

type Props = {
  url: string;
  title?: string | null;
  caption?: string | null;
};

export function NotionEmbed({ url, title, caption }: Props) {
  return (
    <figure className="mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-subtle)]">
      <div className="relative w-full pt-[56.25%]">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={url}
          title={title ?? "Embed"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
      {caption ? (
        <figcaption className="px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-3)]">
          <Text variant="small" className="text-[var(--muted)]">
            {caption}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}
