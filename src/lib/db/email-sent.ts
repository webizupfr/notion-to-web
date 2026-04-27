import 'server-only';

import { and, eq, isNull } from 'drizzle-orm';

import { db, emailSent, type NewEmailSent } from './index';

/**
 * Helpers pour la table `email_sent` — idempotence des triggers d'emails.
 *
 * Pattern d'usage côté trigger :
 *
 *   if (await wasEmailSent({ userId, emailType, programSlug })) return;
 *   const result = await sendReactEmail({ ... });
 *   if (result.ok) await markEmailSent({ userId, emailType, programSlug });
 *
 * Le `programSlug` est optionnel : pour un email non lié à un programme spécifique
 * (rare aujourd'hui), passer `null`.
 */

export type EmailType =
  | 'session-reminder-j-1'
  | 'session-reminder-j0'
  | 'inactivity-relaunch-1'
  | 'inactivity-relaunch-2'
  | 'certificate-ready'
  | 'program-completed';

/**
 * True si un email du type donné a déjà été envoyé à cet user pour ce programme.
 */
export async function wasEmailSent(opts: {
  userId: string;
  emailType: EmailType;
  programSlug: string | null;
}): Promise<boolean> {
  const condProgram =
    opts.programSlug === null
      ? isNull(emailSent.programSlug)
      : eq(emailSent.programSlug, opts.programSlug);

  const rows = await db
    .select({ id: emailSent.id })
    .from(emailSent)
    .where(
      and(
        eq(emailSent.userId, opts.userId),
        eq(emailSent.emailType, opts.emailType),
        condProgram,
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Marque l'email comme envoyé. Idempotent : si déjà marqué, no-op (grâce au
 * UNIQUE INDEX, l'insert est interceptée par `onConflictDoNothing`).
 */
export async function markEmailSent(opts: {
  userId: string;
  emailType: EmailType;
  programSlug: string | null;
}): Promise<void> {
  const row: NewEmailSent = {
    userId: opts.userId,
    emailType: opts.emailType,
    programSlug: opts.programSlug ?? null,
  };
  await db.insert(emailSent).values(row).onConflictDoNothing();
}
