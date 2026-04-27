import 'server-only';

import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { createPurchaseFromSession, markPurchaseRefunded } from '@/lib/db/purchases';
import { enrollUser } from '@/lib/db/progress';
import { getProgramBySlug } from '@/lib/programs';
import { sendReactEmail, isEmailConfigured } from '@/lib/email/resend';
import { PurchaseConfirmationEmail } from '@/components/emails/PurchaseConfirmation';
import { getBaseUrl } from '@/lib/base-url';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import type { ProgramType } from '@/lib/db';

/**
 * Webhook Stripe — reçoit les événements de paiement.
 *
 * Endpoint à configurer dans Stripe Dashboard :
 *   URL : https://<ton-domain>/api/webhooks/stripe
 *   Events :
 *     - checkout.session.completed   (création purchase + enrollment)
 *     - charge.refunded              (révoque l'accès en marquant refunded_at)
 *
 * Sécurité :
 *   - Signature vérifiée via STRIPE_WEBHOOK_SECRET (rejet 400 sinon)
 *   - Idempotence garantie par contrainte unique sur stripe_session_id
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!isStripeConfigured() || !webhookSecret) {
    console.error('[stripe-webhook] missing config (STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET)');
    return NextResponse.json({ error: 'webhook_not_configured' }, { status: 500 });
  }

  const stripe = getStripe()!;
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  // ⚠️ on a besoin du raw body pour vérifier la signature
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[stripe-webhook] signature verification failed', msg);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        // Pas géré, on ack quand même (Stripe n'aime pas les retries inutiles)
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] handler error', event.type, err);
    return NextResponse.json(
      { error: 'handler_failed', message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ───

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // Si payment_status !== 'paid' on skip (ex: en cours, échec)
  if (session.payment_status !== 'paid') {
    console.warn('[stripe-webhook] session not paid, skip', session.id, session.payment_status);
    return;
  }

  const meta = session.metadata ?? {};
  const userId = meta.userId;
  const programSlug = meta.programSlug;
  const programTypeRaw = meta.programType;
  const programType: ProgramType =
    programTypeRaw === 'sync' || programTypeRaw === 'event' ? programTypeRaw : 'async';
  const amount = session.amount_total ?? Number(meta.amount ?? 0);
  const currency = (session.currency ?? meta.currency ?? 'EUR').toUpperCase();

  if (!userId || !programSlug || !amount) {
    console.error('[stripe-webhook] missing metadata', { userId, programSlug, amount });
    return;
  }

  // 1. Récupère l'invoice URL (créée automatiquement via invoice_creation: enabled)
  let invoiceUrl: string | null = null;
  let invoicePdfUrl: string | null = null;
  if (session.invoice) {
    try {
      const stripe = getStripe()!;
      const invoiceId =
        typeof session.invoice === 'string' ? session.invoice : session.invoice.id;
      if (invoiceId) {
        const invoice = await stripe.invoices.retrieve(invoiceId);
        invoiceUrl = invoice.hosted_invoice_url ?? null;
        invoicePdfUrl = invoice.invoice_pdf ?? null;
      }
    } catch (e) {
      console.warn('[stripe-webhook] invoice retrieve failed (non-blocking)', e);
    }
  }

  // 2. Crée la purchase (idempotent via stripe_session_id unique)
  const { created, purchase } = await createPurchaseFromSession({
    userId,
    programSlug,
    programType,
    amount,
    currency,
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    paidAt: new Date(),
    invoiceUrl,
    invoicePdfUrl,
  });

  if (!created) {
    console.log('[stripe-webhook] session already processed', session.id);
    return;
  }

  // 3. Crée l'enrollment automatiquement
  await enrollUser({
    userId,
    programType,
    programSlug,
    cohortSlug: null,
  });

  // 4. Email de confirmation (template react-email)
  if (isEmailConfigured()) {
    try {
      const [program, userRow] = await Promise.all([
        getProgramBySlug(programSlug),
        db.select({ email: users.email, name: users.name }).from(users).where(eq(users.id, userId)).limit(1),
      ]);
      const userInfo = userRow[0];
      if (program && userInfo?.email) {
        const programUrl = `${getBaseUrl()}/programs/${programSlug}`;
        const userName = userInfo.name?.trim() || userInfo.email.split('@')[0];
        const amountFormatted = new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency: currency.toUpperCase(),
        }).format(amount / 100);
        const purchaseDate = new Intl.DateTimeFormat('fr-FR', {
          dateStyle: 'long',
        }).format(new Date());

        await sendReactEmail({
          to: userInfo.email,
          subject: `✅ Bienvenue dans ${program.title}`,
          react: PurchaseConfirmationEmail({
            userName,
            programTitle: program.title,
            programUrl,
            amountFormatted,
            purchaseDate,
            invoiceUrl,
          }),
          tag: 'purchase-confirmation',
        });
      }
    } catch (e) {
      console.error('[stripe-webhook] email failed', e);
    }
  }

  console.log('[stripe-webhook] purchase + enrollment created', purchase?.id, programSlug);
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  // Cherche la session via le payment_intent (stocké en stripe_payment_intent_id)
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!piId) {
    console.warn('[stripe-webhook] refund without payment_intent id');
    return;
  }
  // On retrouve via Stripe la session liée au PI
  const stripe = getStripe()!;
  const sessions = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1 });
  const sessionId = sessions.data[0]?.id;
  if (!sessionId) {
    console.warn('[stripe-webhook] refund : aucune session matchant le PI', piId);
    return;
  }
  await markPurchaseRefunded({ stripeSessionId: sessionId, reason: 'stripe_refund' });
  console.log('[stripe-webhook] purchase refunded', sessionId);
}
