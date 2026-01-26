import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText, type NavigationIndex } from "./RichText";

type Props = {
  richText: RichTextItemResponse[] | undefined;
  navigationIndex?: NavigationIndex | null;
};

export function NotionParagraph({ richText, navigationIndex }: Props) {
  if (!richText || richText.length === 0) return <div className="h-5" aria-hidden />;
  return (
    <div className="prose prose-notion">
      <p className="prose-paragraph">
        <RichText richText={richText} navigationIndex={navigationIndex} />
      </p>
    </div>
  );
}
