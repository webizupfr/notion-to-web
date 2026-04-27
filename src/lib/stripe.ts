import 'server-only';

import Stripe from 'stripe';

/**
 * Wrapper Stripe — singleton serveur.
 *
 * Safe par design : si `STRIPE_SECRET_KEY` manque, `getStripe()` retourne null
 * et les fonctions appelantes désactivent les flows de paiement (les programmes
 * payants reviennent à l'enrollment gratuit ou un message d'erreur).
 */

const apiKey = process.env.STRIPE_SECRET_KEY;

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!apiKey) return null;
  if (!_stripe) {
    _stripe = new Stripe(apiKey, {
      // pin la version API (Stripe en sort une nouvelle tous les 6 mois)
      apiVersion: '2026-04-22.dahlia',
      typescript: true,
    });
  }
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(apiKey);
}
