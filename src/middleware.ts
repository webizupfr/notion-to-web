import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware minimal — Sprint 2 foundations.
 *
 * Aujourd'hui :
 *  - Protège /my-learning : si pas de session NextAuth → redirect /login
 *
 * Tests de session utilisent le cookie session token NextAuth (pas auth() ici car
 * middleware s'exécute côté Edge et next-auth v5 adapter DB n'est pas compatible Edge).
 * La vérif complète (session DB) est faite dans la page server component.
 *
 * Pour la suite (Sprint 3+) : gate les /hubs/[slug] et /sprint/[slug] selon enrollment.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Zone user-auth : /my-learning + /admin + /account (la vérif role=admin est faite en page, pas ici)
  if (
    pathname.startsWith('/my-learning') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/account')
  ) {
    const hasSession =
      req.cookies.has('authjs.session-token') ||
      req.cookies.has('__Secure-authjs.session-token');
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/my-learning/:path*', '/admin/:path*', '/account/:path*'],
};
