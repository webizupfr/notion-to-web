import type { NotionBlock } from "@/lib/notion";

export type NotionSection = {
  id: string;
  index: number;
  blocks: NotionBlock[];
};

/**
 * Split Notion blocks into sections, cutting on divider blocks.
 * Divider blocks are not rendered.
 */
export function splitBlocksIntoSections(blocks: NotionBlock[]): NotionSection[] {
  if (!blocks.length) return [];

  const sections: NotionSection[] = [];
  let current: NotionBlock[] = [];

  const pushCurrent = () => {
    if (!current.length) return;
    const id = (current[0] as { id?: string }).id ?? `section-${sections.length}`;
    sections.push({
      id,
      index: sections.length,
      blocks: current,
    });
    current = [];
  };

  for (const block of blocks) {
    const type = (block as { type?: string }).type;
    if (type === "divider") {
      pushCurrent();
      continue;
    }
    current.push(block);
  }
  pushCurrent();

  // If everything was divider, return a single empty section to avoid blank renders.
  if (!sections.length) {
    return [
      {
        id: "section-0",
        index: 0,
        blocks: [],
      },
    ];
  }

  return sections;
}
