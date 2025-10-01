import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import type { PageBundle } from '@/lib/types';

/**
 * Endpoint de debug pour lister toutes les pages en cache
 * Usage: /api/debug/list
 */
export async function GET() {
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

