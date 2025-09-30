import type { NotionBlock } from "@/lib/notion";

export const slugify = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export type ListBlock = Extract<NotionBlock, { type: "bulleted_list_item" | "numbered_list_item" }>;

export type GroupedListBlock =
  | { type: "bulleted_list_group"; items: ListBlock[] }
  | { type: "numbered_list_group"; items: ListBlock[] };

export type RenderableBlock = NotionBlock | GroupedListBlock;

export function groupLists(blocks: NotionBlock[]): RenderableBlock[] {
  const output: RenderableBlock[] = [];
  let buffer: ListBlock[] = [];
  let current: ListBlock["type"] | null = null;

  const flush = () => {
    if (!buffer.length || !current) return;
    const items = [...buffer];
    output.push({
      type: current === "bulleted_list_item" ? "bulleted_list_group" : "numbered_list_group",
      items,
    });
    buffer = [];
    current = null;
  };

  for (const block of blocks) {
    if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
      if (current && current !== block.type) {
        flush();
      }
      current = block.type;
      buffer.push(block as ListBlock);
    } else {
      flush();
      output.push(block);
    }
  }

  flush();
  return output;
}
