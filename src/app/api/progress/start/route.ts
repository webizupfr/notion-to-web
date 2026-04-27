import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { enrollUser } from '@/lib/db/progress';
import { getProgramBySlug } from '@/lib/programs';
import { sendEmail, isEmailConfigured } from '@/lib/email/resend';
import { welcomeEmail } from '@/lib/email/templates';
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

    // Fire-and-forget welcome email (nouvelle inscription uniquement)
    if (created && isEmailConfigured()) {
      // On ne `await` pas pour ne pas bloquer la réponse ; on catch pour éviter unhandled rejection.
      void (async () => {
        try {
          const program = await getProgramBySlug(parsed.data.programSlug);
          if (!program) return;
          const programUrl = `${getBaseUrl()}/programs/${parsed.data.programSlug}`;
          const tmpl = welcomeEmail({
            recipientName: session.user.name ?? null,
            programTitle: program.title,
            programUrl,
          });
          await sendEmail({
            to: session.user.email!,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
            tag: 'welcome',
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
