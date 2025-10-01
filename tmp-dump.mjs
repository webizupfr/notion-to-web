import { Client } from '@notionhq/client';

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN missing');
  process.exit(1);
}

const notion = new Client({ auth: token });

const pageId = process.argv[2];
if (!pageId) {
  console.error('Usage: node tmp-dump.mjs <pageId>');
  process.exit(1);
}

async function dumpBlocks(id) {
  let cursor;
  const blocks = [];
  do {
    const res = await notion.blocks.children.list({ block_id: id, page_size: 100, start_cursor: cursor });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

const pageIdClean = pageId.replace(/-/g, '');
const blocks = await dumpBlocks(pageIdClean);
console.log(JSON.stringify(blocks, null, 2));
