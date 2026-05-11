import type { ReactNode } from "react";

export function NotionHtml({
  html,
  caption,
}: {
  html: string;
  caption?: string | null;
}): ReactNode {
  return (
    <figure className="notion-html my-[var(--space-lg)] space-y-2">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {caption ? (
        <figcaption className="text-center text-[12px] text-[var(--color-text-secondary)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
