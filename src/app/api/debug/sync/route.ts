import 'server-only';

import { NextResponse } from 'next/server';

import { queryDb } from '@/lib/notion';
import type { PageObjectResponse, QueryDatabaseResponse } from '@notionhq/client/build/src/api-endpoints';
import { runSyncOne } from '../../sync/route';

const PAGES_DB = process.env.NOTION_PAGES_DB;
const POSTS_DB = process.env.NOTION_POSTS_DB;
const HUBS_DB = process.env.NOTION_HUBS_DB;
const CRON_SECRET = process.env.CRON_SECRET;

function firstRichText(property: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!property) return null;
  if (property.type === 'rich_text') return property.rich_text?.[0]?.plain_text ?? null;
  if (property.type === 'title') return property.title?.[0]?.plain_text ?? null;
  if (property.type === 'url') return property.url ?? null;
  return null;
}

export async function GET(request: Request) {
  if (!CRON_SECRET) return NextResponse.json({ error: 'Missing CRON_SECRET' }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = (searchParams.get('slug') || '').replace(/^\//, '');
  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';

  if (secret !== CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  if (!PAGES_DB || !POSTS_DB || !HUBS_DB) {
    return NextResponse.json({ error: 'Missing Notion database env vars' }, { status: 500 });
  }

  // Minimal: run normal sync but prioritize by filtering hubs/pages lists server-side
  // For now we fallback to full sync with skip logic, but we pass force to allow refresh
  try {
    // Quick preflight: does slug exist in hubs?
    const res: QueryDatabaseResponse = await queryDb(HUBS_DB, {
      page_size: 5,
      filter: { property: 'slug', rich_text: { equals: slug } },
    });

    const exists = (res.results as PageObjectResponse[]).some((p) => firstRichText(p.properties.slug) === slug);
    if (!exists) {
      // It's fine; run the sync anyway, skip logic will keep it fast
    }
    const result = await runSyncOne(slug, force);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: 'Failed', details: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
