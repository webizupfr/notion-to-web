import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText } from "./RichText";

type Props = {
  richText: RichTextItemResponse[];
  tone?: string | null;
};

function normalizeTone(tone?: string | null): string {
  if (!tone) return "default";
  return tone.replace("_background", "").toLowerCase();
}

export function NotionQuote({ richText, tone }: Props) {
  const toneAttr = normalizeTone(tone);
  return (
    <div className="notion-quote" data-tone={toneAttr}>
      <span className="notion-quote__dot" aria-hidden />
      <RichText prose={false} richText={richText} />
    </div>
  );
}
