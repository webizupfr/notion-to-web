import 'server-only';

import { NextResponse } from 'next/server';
import { eq, isNull, and } from 'drizzle-orm';

import { auth } from '@/auth';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { db, purchases } from '@/lib/db';

/**
 * Endpoint admin pour back-filler les invoice URLs des anciens achats.
 *
 *   POST /api/admin/backfill-invoices
 *
 * Pour les purchases créés avant que `invoice_creation: { enabled: true }` ne soit
 * activé dans /api/checkout/start (Session 1), Stripe n'a pas créé d'invoice.
 *
 * Cet endpoint :
 *   1. Liste les purchases avec invoice_url IS NULL
 *   2. Pour chaque, retrieve la Stripe Checkout Session par ID
 *   3. Si une invoice est attachée → récupère hosted_invoice_url + invoice_pdf
 *   4. Update la row
 *
 * Si la session n'a pas d'invoice (ancien comportement Stripe), on skip — Stripe
 * ne permet pas de créer une invoice rétroactivement pour un payment_intent.
 *
 * Usage : `curl -X POST https://app.impulsion.studio/api/admin/backfill-invoices`
 * (avec cookie session admin)
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  // Auth admin
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }
  const stripe = getStripe()!;

  // Liste les purchases qui n'ont pas encore d'invoice_url
  const candidates = await db
    .select()
    .from(purchases)
    .where(and(isNull(purchases.invoiceUrl), isNull(purchases.refundedAt)));

  let updated = 0;
  let skipped = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const purchase of candidates) {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(
        purchase.stripeSessionId,
      );
      const invoiceId =
        typeof checkoutSession.invoice === 'string'
          ? checkoutSession.invoice
          : checkoutSession.invoice?.id;

      if (!invoiceId) {
        // Pas d'invoice attachée à cette session (ancien checkout sans invoice_creation)
        skipped += 1;
        continue;
      }

      const invoice = await stripe.invoices.retrieve(invoiceId);
      await db
        .update(purchases)
        .set({
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdfUrl: invoice.invoice_pdf ?? null,
        })
        .where(eq(purchases.id, purchase.id));

      updated += 1;
    } catch (e) {
      errors.push({
        id: purchase.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    candidates: candidates.length,
    updated,
    skipped,
    errors,
  });
}
