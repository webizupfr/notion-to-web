import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import {
  completeActivity,
  getProgramProgress,
  touchEnrollmentActivity,
} from '@/lib/db/progress';
import { getProgramTree } from '@/lib/programs';
import { sendReactEmail, isEmailConfigured } from '@/lib/email/resend';
import { CertificateReadyEmail } from '@/components/emails/CertificateReady';
import { ProgramCompletedEmail } from '@/components/emails/ProgramCompleted';
import { wasEmailSent, markEmailSent } from '@/lib/db/email-sent';
import { getOrIssueCertificate } from '@/lib/db/certificates';
import { getBaseUrl } from '@/lib/base-url';

const BodySchema = z.object({
  programType: z.enum(['async', 'sync', 'event']),
  programSlug: z.string().min(1).max(120),
  cohortSlug: z.string().min(1).max(120).nullish(),
  activityNotionId: z.string().min(10).max(100),
  activitySlug: z.string().min(1).max(120).nullish(),
});

/**
 * POST /api/progress/complete
 *
 * Marque l'activité comme complétée + :
 *   - update enrollment.lastActivityAt (pour les crons d'inactivité)
 *   - si toutes les units sont complétées → enrollment.completedAt + email auto
 *     (CertificateReadyEmail si certificateEnabled, sinon ProgramCompletedEmail)
 *
 * Idempotence des emails via la table `email_sent` (1 envoi par user+programme).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;
  const userEmail = session.user.email;

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'bad_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const row = await completeActivity({
      userId,
      programType: parsed.data.programType,
      programSlug: parsed.data.programSlug,
      cohortSlug: parsed.data.cohortSlug ?? null,
      activityNotionId: parsed.data.activityNotionId,
      activitySlug: parsed.data.activitySlug ?? null,
    });

    // Tracking activity (sans bloquer la réponse)
    void touchEnrollmentActivity({
      userId,
      programType: parsed.data.programType,
      programSlug: parsed.data.programSlug,
      cohortSlug: parsed.data.cohortSlug ?? null,
    }).catch((e) => console.error('[progress/complete] touch enrollment failed', e));

    // Detection 100% complété → email + marquage completedAt enrollment
    void (async () => {
      try {
        const [tree, progress] = await Promise.all([
          getProgramTree(parsed.data.programSlug),
          getProgramProgress({
            userId,
            programType: parsed.data.programType,
            programSlug: parsed.data.programSlug,
            cohortSlug: parsed.data.cohortSlug ?? null,
          }),
        ]);
        if (!tree || tree.units.length === 0) return;
        const completedSet = new Set(
          progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
        );
        const allDone = tree.units.every((u) => completedSet.has(u.meta.notionId));
        if (!allDone) return;

        // Mark enrollment completed
        await touchEnrollmentActivity({
          userId,
          programType: parsed.data.programType,
          programSlug: parsed.data.programSlug,
          cohortSlug: parsed.data.cohortSlug ?? null,
          markCompleted: true,
        });

        if (!isEmailConfigured()) return;

        const userName = session.user.name?.trim() || userEmail.split('@')[0];
        const baseUrl = getBaseUrl();
        const certEnabled = Boolean(tree.meta.certificateEnabled);

        // Émet le certificat (idempotent) et récupère le code → URL de vérif
        if (certEnabled) {
          const completionDates = progress
            .map((p) => p.completedAt)
            .filter((d): d is Date => d instanceof Date);
          const completedAt = completionDates.length
            ? new Date(Math.max(...completionDates.map((d) => d.getTime())))
            : new Date();

          const cert = await getOrIssueCertificate({
            userId,
            programSlug: parsed.data.programSlug,
            recipientName: userName,
            programTitle: tree.meta.title,
            completedAt,
          });
          const verifyUrl = `${baseUrl}/cert/verify/${cert.code}`;
          const certificateUrl = `${baseUrl}/api/certificates/${parsed.data.programSlug}`;

          // Idempotent : 1 seul email par user+programme
          if (
            await wasEmailSent({
              userId,
              emailType: 'certificate-ready',
              programSlug: parsed.data.programSlug,
            })
          ) {
            return;
          }

          const result = await sendReactEmail({
            to: userEmail,
            subject: `🎉 Bravo ${userName} — ton certificat ${tree.meta.title} est prêt`,
            react: CertificateReadyEmail({
              userName,
              programTitle: tree.meta.title,
              certificateUrl,
              verifyUrl,
            }),
            tag: 'certificate-ready',
          });
          if (result.ok) {
            await markEmailSent({
              userId,
              emailType: 'certificate-ready',
              programSlug: parsed.data.programSlug,
            });
          }
          return;
        }

        // Pas de certificat → email "programme terminé" générique
        if (
          await wasEmailSent({
            userId,
            emailType: 'program-completed',
            programSlug: parsed.data.programSlug,
          })
        ) {
          return;
        }

        const result = await sendReactEmail({
          to: userEmail,
          subject: `Bravo — tu as terminé ${tree.meta.title}`,
          react: ProgramCompletedEmail({
            userName,
            programTitle: tree.meta.title,
            unitsCompleted: tree.units.length,
            totalUnits: tree.units.length,
            programsUrl: `${baseUrl}/programs`,
          }),
          tag: 'program-completed',
        });
        if (result.ok) {
          await markEmailSent({
            userId,
            emailType: 'program-completed',
            programSlug: parsed.data.programSlug,
          });
        }
      } catch (e) {
        console.error('[progress/complete] completion email/cert failed', e);
      }
    })();

    return NextResponse.json({ ok: true, progress: row });
  } catch (error) {
    console.error('[progress/complete] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
