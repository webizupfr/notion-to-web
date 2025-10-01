import 'server-only';

import { NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

const CRON_SECRET = process.env.CRON_SECRET;
const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL;

/**
 * 🚀 Endpoint de déclenchement de sync
 * 
 * Ce endpoint déclenche un job en background via QStash.
 * Il retourne immédiatement (pas de timeout) et le sync s'exécute en arrière-plan.
 * 
 * Usage :
 * curl "https://votre-site.com/api/sync/trigger?secret=XXX&force=1"
 */
export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json(
      { error: 'Missing CRON_SECRET env var' },
      { status: 500 }
    );
  }

  if (!QSTASH_TOKEN) {
    return NextResponse.json(
      { error: 'Missing QSTASH_TOKEN env var. Get it from https://console.upstash.com/qstash' },
      { status: 500 }
    );
  }

  if (!SITE_URL) {
    return NextResponse.json(
      { error: 'Missing NEXT_PUBLIC_SITE_URL or VERCEL_URL env var' },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const force = searchParams.get('force') === '1' || searchParams.get('force') === 'true';

  // Vérifier le secret
  if (secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Créer le client QStash
    const qstash = new Client({
      token: QSTASH_TOKEN,
    });

    // Construire l'URL complète du worker
    const workerUrl = SITE_URL.startsWith('http')
      ? `${SITE_URL}/api/sync/worker`
      : `https://${SITE_URL}/api/sync/worker`;

    console.log('[sync-trigger] Triggering background sync job');
    console.log('[sync-trigger] Worker URL:', workerUrl);
    console.log('[sync-trigger] Force:', force);

    // Envoyer le job en background
    const result = await qstash.publishJSON({
      url: workerUrl,
      body: {
        force,
        triggeredAt: new Date().toISOString(),
      },
      headers: {
        'x-sync-secret': CRON_SECRET,
      },
      // Retry en cas d'erreur (optionnel)
      retries: 2,
      // Timeout de 15 minutes (optionnel)
      timeout: '15m',
    });

    console.log('[sync-trigger] Job created:', result.messageId);

    return NextResponse.json({
      ok: true,
      jobId: result.messageId,
      message: 'Sync job started in background. It will run without timeout.',
      workerUrl,
      force,
      // Dashboard URL pour suivre le job
      dashboardUrl: `https://console.upstash.com/qstash?messageId=${result.messageId}`,
    });
  } catch (error) {
    console.error('[sync-trigger] Failed to trigger sync:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to trigger sync',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

