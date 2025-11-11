import 'server-only';

import { NextResponse } from 'next/server';
import { getSprintsIndex, getSprintBundle } from '@/lib/content-store';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const slug = searchParams.get('slug') || undefined;

  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'Missing CRON_SECRET' }, { status: 500 });
  }
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (slug) {
      const bundle = await getSprintBundle(slug);
      if (!bundle) return NextResponse.json({ ok: false, found: false, slug }, { status: 404 });
      return NextResponse.json({ ok: true, bundle });
    }
    const index = await getSprintsIndex();
    return NextResponse.json({ ok: true, index });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}

