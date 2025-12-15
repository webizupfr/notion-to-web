import type { NotionBlock } from "@/lib/notion";

export type SectionHeader = {
  title?: string;
  titleBlockId?: string;
  lead?: string;
  leadBlockId?: string;
  eyebrow?: string;
  eyebrowBlockId?: string;
};

export type ExtractedSection = {
  header: SectionHeader;
  blocks: NotionBlock[];
};

const toPlainText = (rich: { plain_text?: string }[] | null | undefined) =>
  (rich ?? []).map((r) => r.plain_text ?? "").join("").trim();

const HEADING_TYPES = new Set<NotionBlock["type"]>(["heading_1", "heading_2", "heading_3"] as Array<NotionBlock["type"]>);
const isHeading = (block: NotionBlock) => HEADING_TYPES.has(block.type as NotionBlock["type"]);

type BlockPath = number[];
type HeadingMatch = { path: BlockPath; block: NotionBlock; text: string };
type ParagraphMatch = { path: BlockPath; block: NotionBlock; text: string };

const getChildren = (block: NotionBlock): NotionBlock[] =>
  ((block as { __children?: NotionBlock[] }).__children ?? []) as NotionBlock[];

const getHeadingRichText = (block: NotionBlock) => {
  switch (block.type) {
    case "heading_1":
      return block.heading_1?.rich_text ?? [];
    case "heading_2":
      return block.heading_2?.rich_text ?? [];
    case "heading_3":
      return block.heading_3?.rich_text ?? [];
    default:
      return [];
  }
};

const getBlockAtPath = (blocks: NotionBlock[], path: BlockPath): NotionBlock | null => {
  let current: NotionBlock | undefined;
  let nodes = blocks;
  for (const index of path) {
    current = nodes[index];
    if (!current) return null;
    nodes = getChildren(current);
  }
  return current ?? null;
};

const getNodesForParentPath = (blocks: NotionBlock[], path: BlockPath): NotionBlock[] => {
  if (!path.length) return blocks;
  const parent = getBlockAtPath(blocks, path);
  return parent ? getChildren(parent) : [];
};

const removeBlockAtPath = (blocks: NotionBlock[], path: BlockPath): NotionBlock[] => {
  if (!path.length) return blocks;
  const [index, ...rest] = path;
  if (index < 0 || index >= blocks.length) return blocks;

  if (!rest.length) {
    return [...blocks.slice(0, index), ...blocks.slice(index + 1)];
  }

  const target = blocks[index];
  const children = getChildren(target);
  const updatedChildren = removeBlockAtPath(children, rest);
  if (updatedChildren === children) return blocks;

  const clone = { ...(target as Record<string, unknown>), __children: updatedChildren } as unknown as NotionBlock;
  return [...blocks.slice(0, index), clone, ...blocks.slice(index + 1)];
};

const findHeadingTopLevel = (blocks: NotionBlock[]): HeadingMatch | null => {
  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    if (isHeading(block)) {
      const text = toPlainText(getHeadingRichText(block));
      if (text) return { path: [idx], block, text };
    }
  }
  return null;
};

const findHeadingDeep = (nodes: NotionBlock[], parentPath: BlockPath): HeadingMatch | null => {
  for (let idx = 0; idx < nodes.length; idx++) {
    const block = nodes[idx];
    const path = [...parentPath, idx];
    if (isHeading(block)) {
      const text = toPlainText(getHeadingRichText(block));
      if (text) return { path, block, text };
    }
    const children = getChildren(block);
    if (children.length) {
      const nested = findHeadingDeep(children, path);
      if (nested) return nested;
    }
  }
  return null;
};

const findHeadingInFirstColumn = (blocks: NotionBlock[]): HeadingMatch | null => {
  const columnListIndex = blocks.findIndex((block) => block.type === "column_list");
  if (columnListIndex === -1) return null;
  const columns = getChildren(blocks[columnListIndex]);
  const firstColumn = columns[0];
  if (!firstColumn) return null;
  return findHeadingDeep(getChildren(firstColumn), [columnListIndex, 0]);
};

const findHeadingInCallouts = (blocks: NotionBlock[]): HeadingMatch | null => {
  for (let idx = 0; idx < blocks.length; idx++) {
    const block = blocks[idx];
    if (block.type !== "callout") continue;
    const nested = findHeadingDeep(getChildren(block), [idx]);
    if (nested) return nested;
  }
  return null;
};

const findParagraphInBlock = (block: NotionBlock, path: BlockPath): ParagraphMatch | null => {
  if (block.type === "paragraph") {
    const text = toPlainText((block as { paragraph?: { rich_text?: { plain_text?: string }[] } }).paragraph?.rich_text ?? []);
    if (text) return { path, block, text };
  }

  if (block.type === "column_list") {
    const columns = getChildren(block);
    const firstColumn = columns[0];
    if (firstColumn) {
      return findParagraphInNodes(getChildren(firstColumn), [...path, 0], 0);
    }
    return null;
  }

  const children = getChildren(block);
  if (!children.length) return null;
  return findParagraphInNodes(children, path, 0);
};

const findParagraphInNodes = (nodes: NotionBlock[], parentPath: BlockPath, startIndex = 0): ParagraphMatch | null => {
  for (let idx = startIndex; idx < nodes.length; idx++) {
    const block = nodes[idx];
    const path = [...parentPath, idx];
    const found = findParagraphInBlock(block, path);
    if (found) return found;
  }
  return null;
};

const buildSearchContexts = (blocks: NotionBlock[], headingPath: BlockPath) => {
  const contexts: { parentPath: BlockPath; start: number }[] = [];
  const headingIndex = headingPath[headingPath.length - 1];
  let parentPath = headingPath.slice(0, -1);

  contexts.push({ parentPath, start: headingIndex });

  while (parentPath.length) {
    const parentIndex = parentPath[parentPath.length - 1];
    const ancestorPath = parentPath.slice(0, -1);
    const parentBlock = getBlockAtPath(blocks, parentPath);
    const ancestorBlock = ancestorPath.length ? getBlockAtPath(blocks, ancestorPath) : null;
    const parentIsColumn = parentBlock?.type === "column" && ancestorBlock?.type === "column_list";

    if (!parentIsColumn) {
      contexts.push({ parentPath: ancestorPath, start: parentIndex + 1 });
    }

    parentPath = ancestorPath;
  }

  return contexts;
};

const findParagraphAfterHeading = (blocks: NotionBlock[], headingPath: BlockPath): ParagraphMatch | null => {
  const contexts = buildSearchContexts(blocks, headingPath);

  for (const context of contexts) {
    const nodes = getNodesForParentPath(blocks, context.parentPath);
    if (!nodes.length) continue;
    const match = findParagraphInNodes(nodes, context.parentPath, context.start);
    if (match) return match;
  }

  return null;
};

/**
 * Extract the first heading and first paragraph (as lead) from a section.
 * - Looks at top-level blocks first.
 * - If no heading found, looks inside the first column of the first column_list, then callouts.
 * - Removes extracted heading/lead from the returned blocks.
 */
export function extractSectionHeader(blocks: NotionBlock[]): ExtractedSection {
  const headingMatch =
    findHeadingTopLevel(blocks) ?? findHeadingInFirstColumn(blocks) ?? findHeadingInCallouts(blocks);

  if (!headingMatch) {
    return {
      header: { title: "", lead: "" },
      blocks,
    };
  }

  const withoutHeading = removeBlockAtPath(blocks, headingMatch.path);
  const leadMatch = findParagraphAfterHeading(withoutHeading, headingMatch.path);
  const cleanedBlocks = leadMatch ? removeBlockAtPath(withoutHeading, leadMatch.path) : withoutHeading;

  return {
    header: {
      title: headingMatch.text,
      titleBlockId: headingMatch.block.id,
      lead: leadMatch?.text,
      leadBlockId: leadMatch?.block.id,
    },
    blocks: cleanedBlocks,
  };
}
