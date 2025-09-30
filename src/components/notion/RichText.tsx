type R = {
  plain_text: string;
  href?: string | null;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    strikethrough?: boolean;
    code?: boolean;
    color?: string; // e.g. "red" | "red_background" | "default"
  };
};

function getInlineClasses(a: R["annotations"] = {}) {
  return [
    a.bold && "font-semibold",
    a.italic && "italic",
    a.underline && "underline decoration-dotted underline-offset-4",
    a.strikethrough && "line-through",
    a.code && "rt-code rounded px-1.5 py-0.5 font-mono text-[0.85em] tracking-wide",
  ]
    .filter(Boolean)
    .join(" ");
}

function getInlineAttrs(a: R["annotations"] = {}) {
  const attrs: Record<string, string> = {};
  const color = a.color;
  if (color && color !== "default") {
    if (color.endsWith("_background")) {
      attrs["data-bg"] = color.replace("_background", "");
    } else {
      attrs["data-color"] = color;
    }
  }
  return attrs;
}

export function RichText({ rich }: { rich: R[] | undefined }) {
  if (!rich || rich.length === 0) return null;

  return (
    <>
      {rich.map((t, i) => {
        const a = t.annotations || {};
        const classes = getInlineClasses(a);
        const attrs = getInlineAttrs(a);

        // contenu de base
        let el: React.ReactNode = t.plain_text;

        // code inline (style via .rt-code en globals.css)
        if (a.code) el = <code className={classes} {...attrs}>{el}</code>;

        // lien (style via .rt-link en globals.css)
        if (t.href) {
          el = (
            <a
              className={`rt-link ${a.code ? "" : classes}`.trim()}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              {...(a.code ? {} : attrs)}
            >
              {el}
            </a>
          );
        } else if (!a.code) {
          // span standard (marquage via data-attrs)
          el = (
            <span className={`rt-mark ${classes}`.trim()} {...attrs}>
              {el}
            </span>
          );
        }

        return <span key={i}>{el}</span>;
      })}
    </>
  );
}
