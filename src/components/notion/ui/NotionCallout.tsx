import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText, type NavigationIndex } from "./RichText";

type Props = {
  richText: RichTextItemResponse[];
  tone?: string | null;
  icon?: ReactNode | null;
  children?: ReactNode;
  navigationIndex?: NavigationIndex | null;
};

/**
 * Mappe la couleur Notion (avec ou sans suffix _bg) à un tone normalisé.
 * Notion supporte 9 couleurs : gray, brown, orange, yellow, green, blue, purple, pink, red.
 */
function normalizeTone(tone: string | null | undefined): string | null {
  const t = (tone ?? "").toLowerCase().replace(/_bg$/, "");
  if (!t || t === "default") return null;
  const known = ["gray", "brown", "orange", "yellow", "green", "blue", "purple", "pink", "red"];
  return known.includes(t) ? t : null;
}

/**
 * Détecte si le rich_text est un "titre seul" : tout en gras, une seule ligne.
 * Si oui, on peut le rendre plus visible (titre du callout) et déléguer le
 * corps aux children.
 */
function isTitleOnly(richText: RichTextItemResponse[]): boolean {
  if (richText.length === 0) return false;
  const allBold = richText.every((r) => r.annotations?.bold === true);
  const plain = richText.map((r) => r.plain_text ?? "").join("");
  const hasNewline = plain.includes("\n");
  return allBold && !hasNewline && plain.trim().length > 0;
}

export function NotionCallout({ richText, tone, icon, children, navigationIndex }: Props) {
  const dataTone = normalizeTone(tone);
  const hasIcon = Boolean(icon);
  const titleMode = isTitleOnly(richText) && Boolean(children);

  // Mapping legacy (pour compat marketing) — secondaire au data-callout-tone
  const legacyClass =
    dataTone === "yellow" || dataTone === "orange" || dataTone === "brown"
      ? "callout-warning"
      : dataTone === "green"
        ? "callout-success"
        : dataTone === "red" || dataTone === "pink"
          ? "callout-danger"
          : dataTone === "blue" || dataTone === "purple"
            ? "callout-example"
            : "callout-note";

  return (
    <div
      className={`callout ${legacyClass} ${hasIcon ? "" : "callout--no-icon"}`}
      data-callout-tone={dataTone ?? undefined}
    >
      {hasIcon ? (
        <div className="callout__icon" aria-hidden>
          {icon}
        </div>
      ) : null}
      <div className="callout__body">
        {titleMode ? (
          <div className="callout__title">
            <RichText richText={richText} navigationIndex={navigationIndex} />
          </div>
        ) : (
          <RichText richText={richText} navigationIndex={navigationIndex} />
        )}
        {children ? <div className="callout__children prose prose-notion">{children}</div> : null}
      </div>
    </div>
  );
}
