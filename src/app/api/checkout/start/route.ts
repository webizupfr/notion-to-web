import 'server-only';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/auth';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { getProgramBySlug } from '@/lib/programs';
import { hasActivePurchase } from '@/lib/db/purchases';
import { getBaseUrl } from '@/lib/base-url';

/**
 * POST /api/checkout/start
 *   Body: { programSlug }
 *
 * Crée une Stripe Checkout Session pour l'achat d'un programme.
 *
 * Workflow :
 *   1. Auth user (sinon 401)
 *   2. Récupère le programme + son prix
 *   3. Si déjà acheté → 200 { alreadyOwned: true }
 *   4. Sinon : crée Stripe Session avec metadata { userId, programSlug, programType }
 *   5. Renvoie { url } → le client redirige vers Stripe
 *
 * Le webhook /api/webhooks/stripe écoute `checkout.session.completed` pour
 * créer le purchase + l'enrollment côté DB.
 */

export const runtime = 'nodejs';

const BodySchema = z.object({
  programSlug: z.string().min(1).max(120),
});

export async function POST(req: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe not configured (STRIPE_SECRET_KEY missing)' },
      { status: 500 },
    );
  }

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }

  const { programSlug } = parsed.data;
  const program = await getProgramBySlug(programSlug);
  if (!program) {
    return NextResponse.json({ error: 'program_not_found' }, { status: 404 });
  }
  if (!program.price || program.price <= 0) {
    return NextResponse.json({ error: 'program_is_free' }, { status: 400 });
  }

  // Déjà acheté ? On évite de re-créer une session
  const alreadyOwned = await hasActivePurchase({
    userId: session.user.id,
    programSlug,
  });
  if (alreadyOwned) {
    return NextResponse.json({ alreadyOwned: true });
  }

  const stripe = getStripe()!;
  const baseUrl = getBaseUrl();
  const currency = (program.currency ?? 'EUR').toLowerCase();
  const amountCents = Math.round(program.price * 100);

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountCents,
            product_data: {
              name: program.title,
              description: program.description ?? undefined,
              images: program.coverImageUrl ? [program.coverImageUrl] : undefined,
              metadata: {
                programSlug,
                programType: program.type,
              },
            },
          },
        },
      ],
      customer_email: session.user.email,
      client_reference_id: session.user.id,
      // Redirection post-paiement → /my-learning (robuste : pas de dépendance au slug en cache,
      // l'user voit immédiatement son tableau de bord avec le programme déjà enroll via webhook)
      success_url: `${baseUrl}/my-learning?success=1&program=${encodeURIComponent(programSlug)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/programs/${programSlug}?canceled=1`,
      metadata: {
        userId: session.user.id,
        programSlug,
        programType: program.type,
        amount: String(amountCents),
        currency: currency.toUpperCase(),
      },
      // Optionnel : permet à l'user de voir un récap dans Stripe ensuite
      payment_intent_data: {
        metadata: {
          userId: session.user.id,
          programSlug,
          programType: program.type,
        },
      },
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ error: 'stripe_no_url' }, { status: 500 });
    }
    return NextResponse.json({ url: checkoutSession.url, sessionId: checkoutSession.id });
  } catch (error) {
    console.error('[checkout/start] Stripe error', error);
    return NextResponse.json(
      { error: 'stripe_error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
