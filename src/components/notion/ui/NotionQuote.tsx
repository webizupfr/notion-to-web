import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText, type NavigationIndex } from "./RichText";

type Props = {
  richText: RichTextItemResponse[];
  tone?: string | null;
  navigationIndex?: NavigationIndex | null;
};

function normalizeTone(tone?: string | null): string {
  if (!tone) return "default";
  return tone.replace("_background", "").toLowerCase();
}

export function NotionQuote({ richText, tone, navigationIndex }: Props) {
  const toneAttr = normalizeTone(tone);
  return (
    <div className="notion-quote" data-tone={toneAttr}>
      <span className="notion-quote__dot" aria-hidden />
      <RichText prose={false} richText={richText} navigationIndex={navigationIndex} />
    </div>
  );
}
