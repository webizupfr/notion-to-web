import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from '@/auth';

/**
 * Vérifie que l'user courant est admin. Redirige sinon.
 * À utiliser en tête de chaque route/server-action /admin/*.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?next=/admin');
  }
  if (session.user.role !== 'admin') {
    redirect('/my-learning?e=forbidden');
  }
  return session.user;
}
