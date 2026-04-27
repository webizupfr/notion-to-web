import 'server-only';

import { and, eq } from 'drizzle-orm';
import crypto from 'node:crypto';

import { db, certificates, type Certificate } from './index';

/**
 * Helpers pour la table `certificate`.
 *
 * Idempotence : un user a au max 1 certificat par programme.
 * Si on rappelle `getOrIssueCertificate` après émission → retourne le même.
 */

/**
 * Génère un code public stable pour un certificat.
 *
 * Format : `IMP-XXXXXX-XXXX` (lisible, court, 14 chars total)
 * Source : sha256(userId + programSlug + 'impulsion-cert-v1') → take 10 hex chars
 *
 * Pourquoi ce format :
 *   - Préfixe `IMP-` reconnaissable
 *   - Hex uppercase = facile à lire / dicter / re-tape
 *   - Stable : tant que userId + programSlug ne changent pas, même code
 */
export function buildCertificateCode(opts: {
  userId: string;
  programSlug: string;
}): string {
  const raw = `${opts.userId}:${opts.programSlug}:impulsion-cert-v1`;
  const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
  return `IMP-${hash.slice(0, 6)}-${hash.slice(6, 10)}`;
}

/**
 * Récupère un certificat existant par (userId, programSlug).
 * Retourne null si pas encore émis.
 */
export async function getCertificate(opts: {
  userId: string;
  programSlug: string;
}): Promise<Certificate | null> {
  const rows = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, opts.userId),
        eq(certificates.programSlug, opts.programSlug),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Récupère un certificat par son code public.
 * Utilisé par la page /cert/verify/[code].
 */
export async function getCertificateByCode(code: string): Promise<Certificate | null> {
  const rows = await db
    .select()
    .from(certificates)
    .where(eq(certificates.code, code.toUpperCase()))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Émet (ou récupère) un certificat. Idempotent.
 *
 * Si un certificat existe déjà pour (userId, programSlug) → renvoie l'existant
 * (avec son code stable). Sinon insert + return.
 */
export async function getOrIssueCertificate(opts: {
  userId: string;
  programSlug: string;
  recipientName: string;
  programTitle: string;
  completedAt: Date;
}): Promise<Certificate> {
  const existing = await getCertificate({
    userId: opts.userId,
    programSlug: opts.programSlug,
  });
  if (existing) return existing;

  const code = buildCertificateCode({
    userId: opts.userId,
    programSlug: opts.programSlug,
  });

  const [created] = await db
    .insert(certificates)
    .values({
      userId: opts.userId,
      programSlug: opts.programSlug,
      code,
      recipientName: opts.recipientName,
      programTitle: opts.programTitle,
      completedAt: opts.completedAt,
    })
    .returning();

  return created;
}

/** Marque un certificat comme révoqué (refund, fraude, etc). */
export async function revokeCertificate(opts: {
  userId: string;
  programSlug: string;
}) {
  await db
    .update(certificates)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(certificates.userId, opts.userId),
        eq(certificates.programSlug, opts.programSlug),
      ),
    );
}
