import 'server-only';

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';

import { auth } from '@/auth';
import { getProgramTree } from '@/lib/programs';
import { getProgramProgress, isEnrolled } from '@/lib/db/progress';
import { resolveInstructors } from '@/lib/instructors';
import { CertificateDocument } from '@/components/certificates/CertificateDocument';
import { brand } from '@/config/brand';

/**
 * Génère et sert le certificat PDF de complétion d'un programme.
 *
 *   GET /api/certificates/[slug]
 *
 * Prérequis :
 *   - User authentifié
 *   - User inscrit au programme
 *   - 100% des units du programme complétées
 *   - `programMeta.certificateEnabled === true`
 *
 * Le PDF est généré à la volée à chaque requête (pas de stockage) — la DB sert
 * de source de vérité. Le nom du fichier inclut le slug du programme.
 */

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
  }
  const user = session.user;
  const userId = user.id;
  const userName = user.name || user.email || 'Participant';

  // 1. Récupère le programme
  const tree = await getProgramTree(slug);
  if (!tree) {
    return NextResponse.json({ error: 'Programme introuvable' }, { status: 404 });
  }
  if (!tree.meta.certificateEnabled) {
    return NextResponse.json(
      { error: 'Ce programme ne délivre pas de certificat.' },
      { status: 400 },
    );
  }

  // 2. Vérifie l'inscription
  const enrolled = await isEnrolled({
    userId,
    programType: tree.meta.type,
    programSlug: slug,
  });
  if (!enrolled) {
    return NextResponse.json(
      { error: 'Tu n’es pas inscrit.e à ce programme.' },
      { status: 403 },
    );
  }

  // 3. Vérifie la complétion à 100%
  const progress = await getProgramProgress({
    userId,
    programType: tree.meta.type,
    programSlug: slug,
  });
  const completedSet = new Set(
    progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
  );
  const totalUnits = tree.units.length;
  const allDone = totalUnits > 0 && tree.units.every((u) => completedSet.has(u.meta.notionId));
  if (!allDone) {
    return NextResponse.json(
      {
        error: 'Programme pas encore complété',
        completed: completedSet.size,
        total: totalUnits,
      },
      { status: 400 },
    );
  }

  // 4. Résout l'instructor (lead ou premier) pour la signature
  const instructors = await resolveInstructors(tree.meta.instructorIds);
  const lead =
    instructors.find((i) => i.role === 'lead') ?? instructors[0] ?? null;
  const issuerName = lead?.name ?? brand.name;

  // 5. Date de complétion = la plus récente parmi les progress.completedAt
  const completionDates = progress
    .map((p) => p.completedAt)
    .filter((d): d is Date => d instanceof Date);
  const completedAt =
    completionDates.length > 0
      ? new Date(Math.max(...completionDates.map((d) => d.getTime())))
      : new Date();

  // 6. ID de vérification : hash court userId+slug+completedAt
  const verificationId = makeVerificationId(userId, slug, completedAt);

  // 7. Génère le PDF
  const pdfBuffer = await renderToBuffer(
    <CertificateDocument
      recipientName={userName}
      programTitle={tree.meta.title}
      programSubtitle={tree.meta.description ?? null}
      completedAt={completedAt}
      issuerName={issuerName}
      brandName={brand.name}
      verificationId={verificationId}
    />,
  );

  const filename = `Certificat-${slug}-${userId.slice(0, 8)}.pdf`;
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}

/** Petit hash alphanumérique court pour ID de vérif lisible. */
function makeVerificationId(userId: string, slug: string, date: Date): string {
  const raw = `${userId}-${slug}-${date.toISOString().slice(0, 10)}`;
  let h = 5381;
  for (let i = 0; i < raw.length; i++) {
    h = ((h << 5) + h) ^ raw.charCodeAt(i);
  }
  // Normalise en base 36, 10 chars, uppercase
  const positive = Math.abs(h).toString(36).toUpperCase().padStart(6, '0');
  return `${positive.slice(0, 3)}-${positive.slice(3)}`;
}
