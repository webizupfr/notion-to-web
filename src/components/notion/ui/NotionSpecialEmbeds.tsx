import { AirtableEmbed } from "@/components/embeds/Airtable";
import { PdfEmbed } from "@/components/embeds/PdfEmbed";
import { TallyEmbed } from "@/components/embeds/Tally";
import { Text } from "@/components/ui/Text";

type EmbedProps = { url: string; caption?: string | null };

const figureCls =
  "mx-auto w-full max-w-4xl overflow-hidden rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--shadow-subtle)]";
const captionCls = "px-[var(--space-4)] pb-[var(--space-4)] pt-[var(--space-3)]";

export function NotionTallyEmbed({ url, caption }: EmbedProps) {
  const clean = caption?.trim() || null;
  return (
    <figure className={figureCls}>
      <TallyEmbed url={url} className="h-[820px] w-full rounded-[var(--r-xl)]" />
      {clean ? (
        <figcaption className={captionCls}>
          <Text variant="small" className="text-[var(--muted)] text-center">
            {clean}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}

export function NotionAirtableEmbed({ url, caption }: EmbedProps) {
  const clean = caption?.trim() || null;
  return (
    <figure className={figureCls}>
      <AirtableEmbed url={url} />
      {clean ? (
        <figcaption className={captionCls}>
          <Text variant="small" className="text-[var(--muted)] text-center">
            {clean}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}

export function NotionPdfEmbed({ url, caption }: EmbedProps) {
  const clean = caption?.trim() || null;
  return (
    <figure className={figureCls}>
      <PdfEmbed url={url} />
      {clean ? (
        <figcaption className={captionCls}>
          <Text variant="small" className="text-[var(--muted)] text-center">
            {clean}
          </Text>
        </figcaption>
      ) : null}
    </figure>
  );
}
