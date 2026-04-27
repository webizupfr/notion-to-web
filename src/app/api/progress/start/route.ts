import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { enrollUser, touchEnrollmentActivity } from '@/lib/db/progress';
import { getProgramBySlug } from '@/lib/programs';
import { sendReactEmail, isEmailConfigured } from '@/lib/email/resend';
import { EnrollmentWelcomeEmail } from '@/components/emails/EnrollmentWelcome';
import { getBaseUrl } from '@/lib/base-url';

const BodySchema = z.object({
  programType: z.enum(['async', 'sync', 'event']),
  programSlug: z.string().min(1).max(120),
  cohortSlug: z.string().min(1).max(120).nullish(),
});

/**
 * POST /api/progress/start
 * Body: { programType, programSlug, cohortSlug? }
 *
 * Inscrit l'user courant au programme (idempotent).
 * Envoie un email de bienvenue uniquement si c'est une NOUVELLE inscription
 * (évite le spam si l'user reclique "Rejoindre" plusieurs fois).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request', issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { enrollment, created } = await enrollUser({
      userId: session.user.id,
      programType: parsed.data.programType,
      programSlug: parsed.data.programSlug,
      cohortSlug: parsed.data.cohortSlug ?? null,
    });

    // Tracking : chaque visite/start update lastActivityAt (utilisé par les
    // crons d'inactivité pour ignorer les apprenants encore actifs).
    void touchEnrollmentActivity({
      userId: session.user.id,
      programType: parsed.data.programType,
      programSlug: parsed.data.programSlug,
      cohortSlug: parsed.data.cohortSlug ?? null,
    }).catch((e) => console.error('[progress/start] touch enrollment failed', e));

    // Fire-and-forget welcome email (nouvelle inscription uniquement)
    // Note : pour les programmes PAYANTS, le webhook Stripe a déjà créé l'enrollment
    // → ici `created = false` → pas de doublon avec le PurchaseConfirmationEmail.
    if (created && isEmailConfigured()) {
      // On ne `await` pas pour ne pas bloquer la réponse ; on catch pour éviter unhandled rejection.
      void (async () => {
        try {
          const program = await getProgramBySlug(parsed.data.programSlug);
          if (!program) return;
          const programUrl = `${getBaseUrl()}/programs/${parsed.data.programSlug}`;
          const userName =
            session.user.name?.trim() || session.user.email!.split('@')[0];
          // Mode "days" pour async, "modules" pour sync/event
          const programKind: 'days' | 'modules' =
            program.type === 'async' ? 'days' : 'modules';

          await sendReactEmail({
            to: session.user.email!,
            subject: `Bienvenue dans ${program.title}`,
            react: EnrollmentWelcomeEmail({
              userName,
              programTitle: program.title,
              programUrl,
              programKind,
            }),
            tag: 'enrollment-welcome',
          });
        } catch (e) {
          console.error('[progress/start] welcome email failed', e);
        }
      })();
    }

    return NextResponse.json({ ok: true, enrollment, created });
  } catch (error) {
    console.error('[progress/start] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
