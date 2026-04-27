import 'server-only';

import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, purchases } from '@/lib/db';
import type { ProgramType, NewPurchase } from '@/lib/db';

/**
 * Helpers DB pour les achats Stripe.
 *
 * Source de vérité = Stripe. Cette table sert au gating + idempotence webhook.
 */

/** True si l'user a un achat actif (paid_at set, refunded_at null) pour ce programme. */
export async function hasActivePurchase(opts: {
  userId: string;
  programSlug: string;
}): Promise<boolean> {
  const { userId, programSlug } = opts;
  const rows = await db
    .select({ id: purchases.id })
    .from(purchases)
    .where(
      and(
        eq(purchases.userId, userId),
        eq(purchases.programSlug, programSlug),
        isNull(purchases.refundedAt),
      ),
    )
    .limit(1);
  return rows.length > 0 && rows.some((_, i) => i === 0); // au moins 1 row paid + non-refunded
}

/**
 * Crée un purchase à partir d'un Stripe Checkout Session complété.
 * Idempotent via la contrainte unique sur stripeSessionId.
 *
 * @returns { created: true, purchase } si nouveau, { created: false } si déjà inséré
 */
export async function createPurchaseFromSession(
  data: NewPurchase,
): Promise<{ created: boolean; purchase: typeof purchases.$inferSelect | null }> {
  // Check idempotence
  const existing = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripeSessionId, data.stripeSessionId))
    .limit(1);
  if (existing[0]) {
    return { created: false, purchase: existing[0] };
  }
  const [created] = await db.insert(purchases).values(data).returning();
  return { created: true, purchase: created };
}

/** Récupère tous les achats d'un user (récents en premier). */
export async function listUserPurchases(userId: string) {
  return db
    .select()
    .from(purchases)
    .where(eq(purchases.userId, userId))
    .orderBy(desc(purchases.createdAt));
}

/** Récupère un achat par stripeSessionId (debug, webhook). */
export async function getPurchaseBySessionId(stripeSessionId: string) {
  const rows = await db
    .select()
    .from(purchases)
    .where(eq(purchases.stripeSessionId, stripeSessionId))
    .limit(1);
  return rows[0] ?? null;
}

/** Marque un purchase comme refundé (lock l'enrollment ne sera plus auto-rebuild). */
export async function markPurchaseRefunded(opts: {
  stripeSessionId: string;
  reason?: string;
}) {
  await db
    .update(purchases)
    .set({ refundedAt: new Date(), refundReason: opts.reason ?? null })
    .where(eq(purchases.stripeSessionId, opts.stripeSessionId));
}

/**
 * Helper utilitaire : pour un programme et un user, doit-on appliquer le paywall ?
 *
 * Returns true si :
 *   - Le programme a un prix > 0
 *   - L'user n'a pas d'achat actif
 *
 * Returns false (= accès libre) si :
 *   - Le programme est gratuit
 *   - OU l'user a déjà un achat actif (paid + non-refunded)
 */
export async function shouldGatePaywall(opts: {
  userId: string | null | undefined;
  programSlug: string;
  programPrice: number | null | undefined;
}): Promise<boolean> {
  if (!opts.programPrice || opts.programPrice <= 0) return false;
  if (!opts.userId) return true; // pas connecté → paywall
  return !(await hasActivePurchase({ userId: opts.userId, programSlug: opts.programSlug }));
}

// Type re-exports utiles
export type { ProgramType };
