import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

type Props = {
  richText: RichTextItemResponse[] | undefined;
  prose?: boolean;
  className?: string;
};

function Mention({ item }: { item: Extract<RichTextItemResponse, { type: "mention" }> }) {
  const { mention, plain_text } = item;
  const label = plain_text || "mention";
  if (mention.type === "page") {
    const href = `/page/${mention.page.id}`;
    return (
      <a href={href} className="rt rt-link">
        {label}
      </a>
    );
  }
  if (mention.type === "date") {
    const dateVal = mention.date?.start;
    const formatted = dateVal ? new Date(dateVal).toLocaleDateString("fr-FR") : label;
    return <span className="rt">{formatted}</span>;
  }
  return <span className="rt">{label}</span>;
}

export function RichText({ richText, prose = true, className }: Props) {
  if (!richText || richText.length === 0) return null;

  const wrapperClass = [
    prose && "prose prose-notion prose-inline",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={wrapperClass || undefined}>
      {richText.map((item, idx) => {
        const key = `${item.plain_text ?? item.type}-${idx}`;
        const { annotations } = item;
        const tone = annotations?.color ?? "default";
        const isBg = tone.endsWith("_background");
        const colorTone = tone.replace("_background", "");
        const toneClass = isBg ? `rt-bg-${colorTone}` : `rt-color-${colorTone}`;
        const classes = [
          "rt",
          annotations?.bold && "rt-bold",
          annotations?.italic && "rt-italic",
          annotations?.underline && "rt-underline",
          annotations?.strikethrough && "rt-strike",
          annotations?.code && "rt-code",
          toneClass,
        ]
          .filter(Boolean)
          .join(" ");

        if (item.type === "text") {
          const content = item.text?.content ?? "";
          const href = item.href ?? item.text?.link?.url;
          if (href) {
            return (
              <a key={key} href={href} className={`${classes} rt-link`} rel="noreferrer" target="_blank">
                {content}
              </a>
            );
          }
          return (
            <span key={key} className={classes}>
              {content}
            </span>
          );
        }

        if (item.type === "mention") {
          return <Mention key={key} item={item} />;
        }

        if (item.type === "equation") {
          return (
            <code key={key} className={`${classes} rt-code`}>
              {item.equation.expression}
            </code>
          );
        }

        const fallback = (item as { plain_text?: string }).plain_text ?? "";
        return (
          <span key={key} className={classes}>
            {fallback}
          </span>
        );
      })}
    </span>
  );
}
