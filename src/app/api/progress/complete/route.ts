import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import { completeActivity, getProgramProgress } from '@/lib/db/progress';
import { getProgramTree } from '@/lib/programs';
import { sendEmail, isEmailConfigured } from '@/lib/email/resend';
import { programCompletedEmail } from '@/lib/email/templates';
import { getBaseUrl } from '@/lib/base-url';
import { kv } from '@vercel/kv';

const BodySchema = z.object({
  programType: z.enum(['async', 'sync', 'event']),
  programSlug: z.string().min(1).max(120),
  cohortSlug: z.string().min(1).max(120).nullish(),
  activityNotionId: z.string().min(10).max(100),
  activitySlug: z.string().min(1).max(120).nullish(),
});

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL || process.env.KV_URL);
}

/**
 * POST /api/progress/complete
 * Marque l'activité comme complétée + envoie l'email de complétion
 * si le user vient d'atteindre 100% (idempotent, un seul email par programme/user).
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
    const row = await completeActivity({
      userId: session.user.id,
      programType: parsed.data.programType,
      programSlug: parsed.data.programSlug,
      cohortSlug: parsed.data.cohortSlug ?? null,
      activityNotionId: parsed.data.activityNotionId,
      activitySlug: parsed.data.activitySlug ?? null,
    });

    // Vérifie si l'user vient de compléter 100% → email completion (fire-and-forget)
    if (isEmailConfigured()) {
      void (async () => {
        try {
          const [tree, progress] = await Promise.all([
            getProgramTree(parsed.data.programSlug),
            getProgramProgress({
              userId: session.user.id!,
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

          // Dédup : un seul email de complétion par user+programme
          const flagKey = `email:sent:completed:${session.user.id}:${parsed.data.programSlug}`;
          if (hasKv()) {
            const already = await kv.get(flagKey);
            if (already) return;
          }

          const baseUrl = getBaseUrl();
          const programUrl = `${baseUrl}/programs/${parsed.data.programSlug}`;
          const certificateUrl = tree.meta.certificateEnabled
            ? `${baseUrl}/api/certificates/${parsed.data.programSlug}`
            : null;

          const tmpl = programCompletedEmail({
            recipientName: session.user.name ?? null,
            programTitle: tree.meta.title,
            certificateUrl,
            programUrl,
          });
          const sent = await sendEmail({
            to: session.user.email!,
            subject: tmpl.subject,
            html: tmpl.html,
            text: tmpl.text,
            tag: 'completed',
          });
          if (sent.ok && hasKv()) {
            await kv.set(flagKey, new Date().toISOString(), { ex: 60 * 60 * 24 * 365 });
          }
        } catch (e) {
          console.error('[progress/complete] completion email failed', e);
        }
      })();
    }

    return NextResponse.json({ ok: true, progress: row });
  } catch (error) {
    console.error('[progress/complete] failed', error);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
