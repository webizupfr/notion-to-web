import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText } from "./RichText";

type BaseProps = {
  richText: RichTextItemResponse[];
  tone?: string | null;
  level?: 1 | 2 | 3;
  children?: ReactNode;
  defaultOpen?: boolean;
};

export function NotionToggle({ richText, children, defaultOpen, tone, level }: BaseProps) {
  const toneAttr = tone && tone !== "default" ? tone : undefined;
  const levelAttr = typeof level === "number" ? `h${level}` : undefined;
  return (
    <details
      className="learning-toggle"
      open={defaultOpen}
      data-tone={toneAttr}
      data-heading-level={levelAttr}
    >
      <summary>
        <RichText prose={false} richText={richText} />
        <span className="learning-toggle__caret" aria-hidden>▾</span>
      </summary>
      {children ? <div className="learning-toggle__content prose prose-notion">{children}</div> : null}
    </details>
  );
}

type HeadingToggleProps = BaseProps & { level: 1 | 2 | 3 };

export function NotionToggleHeading({
  richText,
  tone,
  children,
  defaultOpen,
  level,
}: HeadingToggleProps) {
  return (
    <NotionToggle richText={richText} tone={tone} defaultOpen={defaultOpen} level={level}>
      {children}
    </NotionToggle>
  );
}
