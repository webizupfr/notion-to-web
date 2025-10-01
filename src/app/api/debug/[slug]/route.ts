import { getPageBundle } from '@/lib/content-store';
import { NextResponse } from 'next/server';

/**
 * Endpoint de debug temporaire pour vérifier les métadonnées d'une page
 * Usage: /api/debug/votre-slug
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  const bundle = await getPageBundle(slug);
  
  if (!bundle) {
    return NextResponse.json({ error: 'Page not found', slug }, { status: 404 });
  }
  
  return NextResponse.json({
    slug,
    meta: bundle.meta,
    hasBlocks: !!bundle.blocks?.length,
    blockCount: bundle.blocks?.length || 0,
    // Détails importants pour la sidebar
    fullWidth: bundle.meta.fullWidth,
    hasChildPages: !!bundle.meta.childPages?.length,
    childPagesCount: bundle.meta.childPages?.length || 0,
    childPages: bundle.meta.childPages || [],
    // Pour vérifier si la condition de la sidebar est remplie
    shouldShowSidebar: bundle.meta.fullWidth && !!bundle.meta.childPages?.length,
  }, {
    headers: {
      'Cache-Control': 'no-cache',
    },
  });
}

