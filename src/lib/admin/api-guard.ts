import 'server-only';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';

/**
 * Garde admin pour les API routes (Route Handlers).
 * Renvoie une `NextResponse` 401/403 si l'utilisateur n'est pas admin,
 * sinon `null` si l'utilisateur est autorisé.
 *
 * Usage :
 * ```ts
 * export async function GET(request: Request) {
 *   const denied = await requireAdminApi();
 *   if (denied) return denied;
 *   // ... logique admin
 * }
 * ```
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
