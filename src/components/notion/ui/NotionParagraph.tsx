import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText } from "./RichText";

type Props = {
  richText: RichTextItemResponse[] | undefined;
};

export function NotionParagraph({ richText }: Props) {
  if (!richText || richText.length === 0) return <div className="h-5" aria-hidden />;
  return (
    <div className="prose prose-notion">
      <p className="prose-paragraph">
        <RichText richText={richText} />
      </p>
    </div>
  );
}
