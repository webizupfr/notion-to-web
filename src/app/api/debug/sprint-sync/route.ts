import 'server-only';

import { NextResponse } from 'next/server';
import { runSyncSprintOne } from '../../sync/route';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Endpoint de debug pour synchroniser UNIQUEMENT un sprint par slug
 * 
 * Usage:
 *   /api/debug/sprint-sync?secret=XXX&slug=<slug>&force=1
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = (searchParams.get('slug') || '').replace(/^\//, '');
  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';

  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'Missing CRON_SECRET' }, { status: 500 });
  }
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
  }

  try {
    const result = await runSyncSprintOne(slug, force);
    if (!result.ok && 'notFound' in result) {
      return NextResponse.json({ ok: false, slug, notFound: true }, { status: 404 });
    }
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

