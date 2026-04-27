import 'server-only';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import type { ReactElement } from 'react';

/**
 * Wrapper minimal autour de Resend pour les emails transactionnels.
 *
 * Deux APIs :
 *   - `sendEmail({to, subject, html, text})` : envoi raw HTML (legacy)
 *   - `sendReactEmail({to, subject, react: <Template/>})` : rendu via react-email
 *     (recommandé — c'est ce que tous les nouveaux templates utilisent).
 *
 * Safe par design : si `AUTH_RESEND_KEY` manque, les fonctions no-op et logguent
 * plutôt que crasher. Les flows applicatifs continuent en silence.
 */

const apiKey = process.env.AUTH_RESEND_KEY;
const defaultFrom = process.env.AUTH_RESEND_FROM;

const resend = apiKey ? new Resend(apiKey) : null;

type SendOpts = {
  to: string;
  subject: string;
  html: string;
  /** Plain text fallback — recommandé pour la délivrabilité. */
  text?: string;
  /** Override du `from` (sinon = AUTH_RESEND_FROM). */
  from?: string;
  /** Tag Resend pour tracking (ex: 'welcome', 'unit-unlock'). */
  tag?: string;
  /** Reply-To header (par défaut = `from`). Utile pour relances perso. */
  replyTo?: string;
};

export async function sendEmail(opts: SendOpts): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend || !defaultFrom) {
    console.warn('[email] sendEmail no-op (Resend not configured)', { to: opts.to, subject: opts.subject });
    return { ok: false, error: 'resend_not_configured' };
  }

  try {
    const r = await resend.emails.send({
      from: opts.from ?? defaultFrom,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
      tags: opts.tag ? [{ name: 'type', value: opts.tag }] : undefined,
    });
    if (r.error) {
      console.error('[email] send failed', { to: opts.to, subject: opts.subject, error: r.error });
      return { ok: false, error: r.error.message ?? 'resend_error' };
    }
    return { ok: true, id: r.data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] send threw', { to: opts.to, subject: opts.subject, error: msg });
    return { ok: false, error: msg };
  }
}

/** True si Resend est configuré. Utile pour skip l'appel si pas prêt. */
export function isEmailConfigured(): boolean {
  return Boolean(apiKey && defaultFrom);
}

/**
 * Envoi d'email via un composant React (template react-email).
 *
 * Render automatique :
 *   - HTML version  → react-email/components `render(component)`
 *   - Plain text    → version `plainText: true` (fallback délivrabilité)
 *
 * Usage :
 *   await sendReactEmail({
 *     to: 'arthur@example.com',
 *     subject: 'Bienvenue',
 *     react: <PurchaseConfirmationEmail userName="..." ... />,
 *     tag: 'purchase',
 *   });
 */
export async function sendReactEmail(opts: {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
  tag?: string;
  /** Optionnel : `replyTo` (utile pour invitations à répondre, ex: relances). */
  replyTo?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend || !defaultFrom) {
    console.warn('[email] sendReactEmail no-op (Resend not configured)', {
      to: opts.to,
      subject: opts.subject,
    });
    return { ok: false, error: 'resend_not_configured' };
  }

  let html: string;
  let text: string;
  try {
    [html, text] = await Promise.all([
      render(opts.react),
      render(opts.react, { plainText: true }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[email] react-email render failed', {
      to: opts.to,
      subject: opts.subject,
      error: msg,
    });
    return { ok: false, error: `render_failed: ${msg}` };
  }

  return sendEmail({
    to: opts.to,
    subject: opts.subject,
    html,
    text,
    from: opts.from,
    tag: opts.tag,
    replyTo: opts.replyTo,
  });
}
