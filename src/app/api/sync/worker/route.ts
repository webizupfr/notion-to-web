import 'server-only';

import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

/**
 * 🎯 Worker de synchronisation (exécuté par QStash)
 * 
 * Ce endpoint est appelé par QStash en background.
 * Il n'a PAS de limite de temps (pas de maxDuration).
 * 
 * La signature QStash est vérifiée automatiquement pour la sécurité.
 */

// PAS de maxDuration = pas de limite de temps ! 🎉
export const runtime = 'nodejs';

const PAGES_DB = process.env.NOTION_PAGES_DB;
const POSTS_DB = process.env.NOTION_POSTS_DB;
const CRON_SECRET = process.env.CRON_SECRET;
const SYNC_FAILURE_WEBHOOK = process.env.SYNC_FAILURE_WEBHOOK;

async function notifySyncFailure(payload: Record<string, unknown>) {
  if (!SYNC_FAILURE_WEBHOOK) return;
  try {
    await fetch(SYNC_FAILURE_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('[sync] Failed to send failure notification:', error);
  }
}

async function POST_HANDLER(request: Request) {
  console.log('[sync-worker] 🚀 Background sync job started');
  
  if (!CRON_SECRET || !PAGES_DB || !POSTS_DB) {
    return NextResponse.json(
      { error: 'Missing required environment variables' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const force = body.force ?? false;
    const triggeredAt = body.triggeredAt;

    console.log('[sync-worker] Force mode:', force);
    console.log('[sync-worker] Triggered at:', triggeredAt);

    // Importer la fonction de sync depuis le module route
    // Cela permet d'exécuter la sync directement en TypeScript
    // SANS passer par HTTP et SANS limitation de temps ! 🎉
    const { runFullSync } = await import('../route');

    console.log('[sync-worker] Running full sync directly (no HTTP, no timeout)...');

    let result;
    let attempt = 0;
    const maxRetries = 2;
    
    while (attempt <= maxRetries) {
      try {
        result = await runFullSync(force);
        break; // Success, sortir de la boucle
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Si c'est un rate limit et qu'il reste des tentatives
        if (errorMessage.includes('rate limit') && attempt < maxRetries) {
          attempt++;
          const waitTime = Math.pow(2, attempt) * 30000; // 30s, 60s, 120s...
          console.log(`[sync-worker] ⏳ Rate limited, waiting ${waitTime/1000}s before retry ${attempt}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // Autre erreur ou plus de retry, on throw
        throw error;
      }
    }

    console.log('[sync-worker] ✅ Sync completed successfully');
    console.log('[sync-worker] Result:', {
      synced: result.synced,
      posts: result.posts,
      duration: result.metrics.durationMs,
      childPagesSynced: result.metrics.childPagesSynced,
    });

    return NextResponse.json({
      ok: true,
      completedAt: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error('[sync-worker] ❌ Sync failed:', error);

    await notifySyncFailure({
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      source: 'qstash-worker',
    });

    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Vérifier la signature QStash pour la sécurité
export const POST = verifySignatureAppRouter(POST_HANDLER);

