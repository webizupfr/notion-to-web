import 'server-only';

/**
 * Templates HTML inline pour les emails transactionnels.
 *
 * Design sobre, éditorial, cohérent avec la plateforme (yellow accent + serif
 * display + neutrals). Compatible clients email courants (Gmail, Outlook, Apple
 * Mail) — styles inline, pas de CSS externe.
 *
 * Tous les templates exposent {html, text, subject} pour sendEmail().
 */

import { brand } from '@/config/brand';

type RenderedEmail = { subject: string; html: string; text: string };

// ─── Styles partagés (inline, pour compat clients) ───

const ACCENT = '#F5D54C';
const INK = '#0F1724';
const MUTED = '#6B7280';
const BORDER = '#E2E4E8';
const BG = '#FDFCF9';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(opts: {
  preview: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  footer?: string;
}): string {
  const cta =
    opts.ctaLabel && opts.ctaHref
      ? `
        <tr><td style="padding-top:24px;padding-bottom:16px">
          <a href="${escapeHtml(opts.ctaHref)}"
             style="display:inline-block;padding:12px 22px;background:${ACCENT};color:${INK};text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
            ${escapeHtml(opts.ctaLabel)}
          </a>
        </td></tr>`
      : '';

  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .email-bg { background:#0F1724 !important; }
    .email-card { background:#17202E !important; }
    .email-text-primary { color:#F1F5F9 !important; }
    .email-text-secondary { color:#94A3B8 !important; }
    .email-border { border-color:#2D3B4F !important; }
  }
</style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${INK}">
<span style="display:none;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${escapeHtml(opts.preview)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%">
      <tr><td style="padding-bottom:24px;font-family:-apple-system,sans-serif;font-size:13px;color:${MUTED};letter-spacing:0.08em;text-transform:uppercase">
        <span style="display:inline-block;width:8px;height:8px;background:${ACCENT};border-radius:50%;margin-right:8px;vertical-align:middle"></span>
        ${escapeHtml(brand.name)}
      </td></tr>
      <tr><td class="email-card email-border" style="background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;padding:32px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${opts.bodyHtml}
          ${cta}
        </table>
      </td></tr>
      <tr><td style="padding-top:24px;font-size:12px;color:${MUTED};line-height:1.5">
        ${opts.footer ?? `Cet email vient de ${escapeHtml(brand.name)}. Si tu ne veux plus en recevoir, réponds simplement à cet email.`}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function heading(text: string): string {
  return `<tr><td style="padding-bottom:12px">
    <h1 class="email-text-primary" style="margin:0;font-size:26px;line-height:1.2;letter-spacing:-0.02em;color:${INK};font-weight:700">${escapeHtml(text)}</h1>
  </td></tr>`;
}

function para(text: string): string {
  return `<tr><td class="email-text-secondary" style="padding-bottom:12px;font-size:15px;line-height:1.6;color:${INK}">
    ${escapeHtml(text)}
  </td></tr>`;
}

// ─── Email 1 : Welcome (inscription confirmée) ───

export function welcomeEmail(opts: {
  recipientName?: string | null;
  programTitle: string;
  programUrl: string;
}): RenderedEmail {
  const greeting = opts.recipientName ? `Bonjour ${opts.recipientName},` : 'Bonjour,';
  const subject = `Bienvenue dans ${opts.programTitle}`;

  const html = shell({
    preview: `Ton inscription à ${opts.programTitle} est confirmée.`,
    title: subject,
    bodyHtml:
      heading(`Bienvenue 👋`) +
      para(greeting) +
      para(`Ton inscription au programme « ${opts.programTitle} » est bien enregistrée.`) +
      para(
        `Tu peux démarrer dès maintenant. Chaque jour/unité se débloque à ton rythme, 24h après le précédent.`,
      ),
    ctaLabel: 'Démarrer le programme →',
    ctaHref: opts.programUrl,
  });

  const text = `${greeting}

Ton inscription au programme "${opts.programTitle}" est bien enregistrée.

Tu peux démarrer dès maintenant. Chaque jour se débloque 24h après le précédent.

→ ${opts.programUrl}

— ${brand.name}`;

  return { subject, html, text };
}

// ─── Email 2 : Unit unlocked ("ta prochaine unité est dispo") ───

export function unitUnlockedEmail(opts: {
  recipientName?: string | null;
  programTitle: string;
  unitLabel: string; // "Jour", "Module"
  unitOrder: number;
  unitTitle: string;
  unitUrl: string;
}): RenderedEmail {
  const greeting = opts.recipientName ? `${opts.recipientName},` : 'Salut,';
  const unitFull = `${opts.unitLabel} ${String(opts.unitOrder).padStart(2, '0')} — ${opts.unitTitle}`;
  const subject = `${unitFull} est disponible`;

  const html = shell({
    preview: `${unitFull} vient de se débloquer dans ${opts.programTitle}.`,
    title: subject,
    bodyHtml:
      heading(`${opts.unitLabel} ${String(opts.unitOrder).padStart(2, '0')} est dispo`) +
      para(greeting) +
      para(
        `${unitFull} vient de se débloquer dans « ${opts.programTitle} ». Reprends là où tu t'étais arrêté.e.`,
      ),
    ctaLabel: `Démarrer ${opts.unitLabel.toLowerCase()} ${String(opts.unitOrder).padStart(2, '0')} →`,
    ctaHref: opts.unitUrl,
  });

  const text = `${greeting}

${unitFull} vient de se débloquer dans "${opts.programTitle}".

→ ${opts.unitUrl}

— ${brand.name}`;

  return { subject, html, text };
}

// ─── Email 3 : Program completed ───

export function programCompletedEmail(opts: {
  recipientName?: string | null;
  programTitle: string;
  certificateUrl?: string | null;
  programUrl: string;
}): RenderedEmail {
  const greeting = opts.recipientName ? `Bravo ${opts.recipientName} !` : 'Bravo !';
  const subject = `🎉 Tu as terminé ${opts.programTitle}`;

  const certBlock = opts.certificateUrl
    ? para(`Ton certificat de complétion est prêt. Tu peux le télécharger en PDF ci-dessous.`)
    : '';

  const html = shell({
    preview: `Tu as complété ${opts.programTitle}. Félicitations !`,
    title: subject,
    bodyHtml:
      heading(`🎉 Programme terminé`) +
      para(greeting) +
      para(
        `Tu viens de compléter l'intégralité du programme « ${opts.programTitle} ». C'est un vrai accomplissement.`,
      ) +
      certBlock +
      para(`Tu peux toujours revenir consulter le contenu quand tu veux.`),
    ctaLabel: opts.certificateUrl ? 'Télécharger mon certificat →' : 'Retourner au programme →',
    ctaHref: opts.certificateUrl ?? opts.programUrl,
  });

  const text = `${greeting}

Tu viens de compléter l'intégralité du programme "${opts.programTitle}". Félicitations !

${opts.certificateUrl ? `Télécharger ton certificat : ${opts.certificateUrl}` : `Retour au programme : ${opts.programUrl}`}

— ${brand.name}`;

  return { subject, html, text };
}
