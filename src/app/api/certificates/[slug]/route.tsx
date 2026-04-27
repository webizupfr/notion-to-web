import 'server-only';

import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';

import { auth } from '@/auth';
import { getProgramTree } from '@/lib/programs';
import { getProgramProgress, isEnrolled } from '@/lib/db/progress';
import { getOrIssueCertificate } from '@/lib/db/certificates';
import { CertificateDocument } from '@/components/certificates/CertificateDocument';
import { brand } from '@/config/brand';
import { getBaseUrl } from '@/lib/base-url';

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
 * Persistance :
 *   - 1ère émission → row insérée dans `certificate` (code stable, idempotent)
 *   - Re-téléchargement → reuse du même code
 *   - PDF re-généré à la volée à chaque requête (pas de stockage du PDF)
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
  const userName = user.name?.trim() || user.email?.split('@')[0] || 'Apprenant';

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
      { error: "Tu n'es pas inscrit·e à ce programme." },
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

  // 4. Date de complétion = la plus récente parmi les progress.completedAt
  const completionDates = progress
    .map((p) => p.completedAt)
    .filter((d): d is Date => d instanceof Date);
  const completedAt =
    completionDates.length > 0
      ? new Date(Math.max(...completionDates.map((d) => d.getTime())))
      : new Date();

  // 5. Idempotent : récupère ou émet le certificat (code stable)
  const cert = await getOrIssueCertificate({
    userId,
    programSlug: slug,
    recipientName: userName,
    programTitle: tree.meta.title,
    completedAt,
  });

  // 6. Génère le PDF avec le code persisté
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/cert/verify/${cert.code}`;

  const pdfBuffer = await renderToBuffer(
    <CertificateDocument
      recipientName={cert.recipientName}
      programTitle={cert.programTitle}
      programSubtitle={tree.meta.description ?? null}
      // TODO: ajouter le mapping `learningOutcomes` dans ProgramMeta (lib/programs.ts)
      // depuis le champ Notion correspondant. En attendant, on passe null et le
      // composant skippe automatiquement le block "Compétences validées".
      learningOutcomes={null}
      completedAt={cert.completedAt}
      issuerName="Arthur Maréchaux"
      issuerTitle="Fondateur d'Impulsion"
      brandName={brand.name}
      verificationCode={cert.code}
      verificationUrl={verificationUrl.replace(/^https?:\/\//, '')}
    />,
  );

  const filename = `Certificat-${slug}-${cert.code}.pdf`;
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'private, no-cache',
    },
  });
}
