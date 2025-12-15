import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText } from "./RichText";

type Props = {
  richText: RichTextItemResponse[];
  tone?: string | null;
  icon?: ReactNode | null;
  children?: ReactNode;
};

export function NotionCallout({ richText, tone, icon, children }: Props) {
  const t = (tone ?? "").toLowerCase();
  const hasIcon = Boolean(icon);
  const toneClass =
    t.includes("yellow") || t.includes("orange")
      ? "callout-warning"
      : t.includes("green")
        ? "callout-success"
        : t.includes("red") || t.includes("pink")
          ? "callout-danger"
          : t.includes("blue") || t.includes("purple")
            ? "callout-example"
            : "callout-note";
  return (
    <div className={`callout ${toneClass} ${hasIcon ? "" : "callout--no-icon"}`}>
      {hasIcon ? (
        <div className="callout__icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <div className="callout__body">
        <RichText richText={richText} />
        {children ? <div className="callout__children prose prose-notion">{children}</div> : null}
      </div>
    </div>
  );
}
