import type { ReactNode } from "react";
import type { NotionBlock } from "@/lib/notion";

export type MarketingSectionProps = {
  preset?: string | null;
  title?: string | null;
  lead?: string | null;
  eyebrow?: string | null;
  blocks: NotionBlock[];
  baseSlug: string;
  children?: ReactNode;
  bodyVariant?: "default" | "dense" | "wide" | (string & {});
};
