import type { CSSProperties } from "react";

import { NotionMediaFrame } from "./NotionMediaFrame";

type Props = {
  src: string;
  alt?: string | null;
  caption?: string | null;
  width?: number | null;
  height?: number | null;
  maxWidthPx?: number | null;
  align?: "left" | "center" | "right";
  withBackground?: boolean;
};

export function NotionImage({
  src,
  alt,
  caption,
  width,
  height,
  maxWidthPx,
  align = "center",
  withBackground = true,
}: Props) {
  const style: CSSProperties = {};
  if (maxWidthPx) style.maxWidth = `${maxWidthPx}px`;

  const justify =
    align === "left" ? "justify-start" : align === "right" ? "justify-end" : "justify-center";

  return (
    <div
      className={`mx-auto flex w-full ${justify}`}
      style={style}
      data-with-background={withBackground ? "on" : "off"}
    >
      <NotionMediaFrame caption={caption} padding="xs">
        <div className="bg-transparent">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt ?? ""}
            width={width ?? undefined}
            height={height ?? undefined}
            className="block h-auto w-full"
            loading="lazy"
          />
        </div>
      </NotionMediaFrame>
    </div>
  );
}
