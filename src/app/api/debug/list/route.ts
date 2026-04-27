import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import type { PageBundle } from '@/lib/content-store';
import { requireAdminApi } from '@/lib/admin/api-guard';

/**
 * Endpoint de debug pour lister toutes les pages en cache.
 * Réservé aux admins.
 * Usage: /api/debug/list
 */
export async function GET() {
  const denied = await requireAdminApi();
  if (denied) return denied;
  try {
    // Lister toutes les clés qui commencent par "page:"
    const keys = await kv.keys('page:*');
    
    const pages = [];
    
    for (const key of keys) {
      const slug = key.replace('page:', '');
      const bundle = await kv.get(key) as PageBundle | null;
      
      if (bundle?.meta) {
        pages.push({
          slug,
          title: bundle.meta.title,
          fullWidth: bundle.meta.fullWidth,
          hasChildPages: !!bundle.meta.childPages?.length,
          childPagesCount: bundle.meta.childPages?.length || 0,
        });
      }
    }
    
    return NextResponse.json({
      total: pages.length,
      pages: pages.sort((a, b) => a.slug.localeCompare(b.slug)),
    }, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to list pages',
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

