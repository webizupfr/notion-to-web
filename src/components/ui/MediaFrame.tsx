import Image from "next/image";
import type { CSSProperties } from "react";

type Align = "left" | "center" | "right";

export type MediaFrameProps = {
  src: string;
  alt?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  maxWidthPx?: number | null;
  align?: Align;
  withBackground?: boolean;
};

export function MediaFrame({
  src,
  alt,
  caption,
  width,
  height,
  maxWidthPx,
  align = "center",
  withBackground = true,
}: MediaFrameProps) {
  const figureStyle: CSSProperties = {};
  if (maxWidthPx) figureStyle.maxWidth = `${maxWidthPx}px`;
  if (align === "left") {
    figureStyle.marginInlineStart = "0";
    figureStyle.marginInlineEnd = "auto";
  } else if (align === "right") {
    figureStyle.marginInlineStart = "auto";
    figureStyle.marginInlineEnd = "0";
  }

  const figureClass = withBackground
    ? "media-figure inline-block max-w-full overflow-hidden rounded-[var(--r-xl)] border border-[color:var(--border)]"
    : "media-figure inline-block max-w-full overflow-hidden rounded-[var(--r-xl)]";

  const imageClass = "block h-auto w-full object-contain rounded-[var(--r-xl)]";

  return (
    <figure className={figureClass} style={figureStyle}>
      <Image
        src={src}
        alt={alt ?? ""}
        width={width ?? 1600}
        height={height ?? 900}
        sizes="100vw"
        className={imageClass}
        loading="lazy"
      />
      {caption ? (
        <figcaption className={withBackground ? "px-6 pb-4 pt-3 text-sm text-[0.95rem]" : "mt-3 text-center text-sm text-[0.95rem] text-[color:var(--muted)]"}>
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
