import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/notion';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';

const PAGES_DB = process.env.NOTION_PAGES_DB;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Endpoint de debug pour synchroniser UNIQUEMENT la page "doc"
 * et retourner tous les logs dans la réponse
 * 
 * Usage: /api/debug/sync-doc?secret=YOUR_SECRET
 */
export async function GET(request: Request) {
  if (!CRON_SECRET || !PAGES_DB) {
    return NextResponse.json({ error: 'Missing env vars' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Capturer tous les logs console
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    logs.push(`[LOG] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`);
    originalLog(...args);
  };
  console.warn = (...args: unknown[]) => {
    logs.push(`[WARN] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`);
    originalWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    logs.push(`[ERROR] ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`);
    originalError(...args);
  };

  try {
    // Trouver la page "doc"
    const response = await queryDb(PAGES_DB, {
      filter: {
        property: 'slug',
        rich_text: {
          equals: 'doc'
        }
      },
      page_size: 1
    });

    const pages = response.results.filter(
      (p): p is PageObjectResponse => p.object === 'page'
    );

    if (pages.length === 0) {
      return NextResponse.json({
        error: 'Page "doc" not found',
        logs
      }, { status: 404 });
    }

    const docPage = pages[0];
    logs.push(`[INFO] Found page "doc" with ID: ${docPage.id}`);

    // Importer la fonction de sync
    const { runFullSync } = await import('../../sync/route');
    
    // Lancer une sync forcée (pour être sûr que "doc" est sync)
    logs.push('[INFO] Starting full sync (force=true)...');
    await runFullSync(true);
    logs.push('[INFO] Full sync completed!');

    // Restaurer console
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    return NextResponse.json({
      success: true,
      pageId: docPage.id,
      logs,
      message: 'Sync completed! Check logs above for full_width detection details.'
    });

  } catch (error) {
    // Restaurer console
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;

    logs.push(`[FATAL ERROR] ${error instanceof Error ? error.message : String(error)}`);

    return NextResponse.json({
      error: 'Sync failed',
      details: error instanceof Error ? error.message : String(error),
      logs
    }, { status: 500 });
  }
}

