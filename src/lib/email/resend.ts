import 'server-only';
import { Resend } from 'resend';

/**
 * Wrapper minimal autour de Resend pour les emails transactionnels.
 *
 * Safe par design : si `AUTH_RESEND_KEY` manque, `sendEmail()` no-op et log
 * plutôt que crasher. Les flows applicatifs continuent en silence (pas d'erreur
 * bloquante pour l'user si l'email ne part pas).
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
