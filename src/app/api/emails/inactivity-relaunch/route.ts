import 'server-only';

import { NextResponse } from 'next/server';
import { eq, and, isNull, isNotNull, lt, gte } from 'drizzle-orm';

import { db, enrollments, users } from '@/lib/db';
import { getProgramTree } from '@/lib/programs';
import { getProgramProgress } from '@/lib/db/progress';
import { sendReactEmail, isEmailConfigured } from '@/lib/email/resend';
import { InactivityRelaunchEmail } from '@/components/emails/InactivityRelaunch';
import { wasEmailSent, markEmailSent } from '@/lib/db/email-sent';
import { getBaseUrl } from '@/lib/base-url';

/**
 * Cron quotidien : relance les apprenants inactifs.
 *
 *   GET /api/emails/inactivity-relaunch?secret=CRON_SECRET
 *
 * Schedule recommandé : quotidien à 8h UTC (= 10h Paris été).
 *
 * Logique :
 *   - Relance #1 : enrollments actifs (non-completed) avec lastActivityAt
 *     entre J-7 et J-14 → email "Tu en es où ?"
 *   - Relance #2 : entre J-14 et J-21 → email "Dernière relance"
 *   - Au-delà de J-21 d'inactivité : on stoppe (pas de spam).
 *
 * Idempotence : 1 row dans `email_sent` par variant × user × programme.
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;

function isAuthorized(request: Request): boolean {
  if (!CRON_SECRET) return false;
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${CRON_SECRET}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get('secret') === CRON_SECRET;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Email not configured' },
      { status: 500 },
    );
  }

  const startedAt = Date.now();
  const stats = {
    candidatesChecked: 0,
    relaunch1Sent: 0,
    relaunch2Sent: 0,
    skipped: 0,
    errors: [] as Array<{ userId: string; programSlug: string; error: string }>,
  };

  try {
    const now = new Date();
    const day7Ago = new Date(now);
    day7Ago.setDate(day7Ago.getDate() - 7);
    const day14Ago = new Date(now);
    day14Ago.setDate(day14Ago.getDate() - 14);
    const day21Ago = new Date(now);
    day21Ago.setDate(day21Ago.getDate() - 21);

    // Window relance #1 : lastActivityAt ∈ [J-14, J-7) (i.e., il y a entre 7 et 14 jours)
    const window1 = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        programSlug: enrollments.programSlug,
        programType: enrollments.programType,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .where(
        and(
          isNull(enrollments.completedAt),
          isNotNull(enrollments.lastActivityAt),
          lt(enrollments.lastActivityAt, day7Ago),
          gte(enrollments.lastActivityAt, day14Ago),
        ),
      );

    // Window relance #2 : lastActivityAt ∈ [J-21, J-14)
    const window2 = await db
      .select({
        userId: users.id,
        email: users.email,
        name: users.name,
        programSlug: enrollments.programSlug,
        programType: enrollments.programType,
      })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.userId, users.id))
      .where(
        and(
          isNull(enrollments.completedAt),
          isNotNull(enrollments.lastActivityAt),
          lt(enrollments.lastActivityAt, day14Ago),
          gte(enrollments.lastActivityAt, day21Ago),
        ),
      );

    const baseUrl = getBaseUrl();

    async function processCandidate(
      candidate: typeof window1[number],
      variant: 1 | 2,
    ) {
      stats.candidatesChecked += 1;
      if (!candidate.email) {
        stats.skipped += 1;
        return;
      }
      try {
        const emailType = variant === 1 ? 'inactivity-relaunch-1' : 'inactivity-relaunch-2';
        if (
          await wasEmailSent({
            userId: candidate.userId,
            emailType,
            programSlug: candidate.programSlug,
          })
        ) {
          stats.skipped += 1;
          return;
        }

        const tree = await getProgramTree(candidate.programSlug);
        if (!tree) {
          stats.skipped += 1;
          return;
        }

        // Calcule progress %
        const progress = await getProgramProgress({
          userId: candidate.userId,
          programType: candidate.programType,
          programSlug: candidate.programSlug,
        });
        const completedSet = new Set(
          progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
        );
        const total = tree.units.length;
        const completed = tree.units.filter((u) => completedSet.has(u.meta.notionId)).length;
        const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

        // Trouve la prochaine unit non-complétée
        const nextUnit = tree.units.find((u) => !completedSet.has(u.meta.notionId));
        const nextUnitLabel = nextUnit
          ? nextUnit.meta.order
            ? `${tree.meta.type === 'async' ? 'Jour' : 'Module'} ${nextUnit.meta.order} — ${nextUnit.meta.title}`
            : nextUnit.meta.title
          : null;

        const userName = candidate.name?.trim() || candidate.email.split('@')[0];
        const programUrl = `${baseUrl}/programs/${candidate.programSlug}`;

        const result = await sendReactEmail({
          to: candidate.email,
          subject:
            variant === 1
              ? `${userName}, tu en es où sur ${tree.meta.title} ?`
              : `${userName}, dernière relance — ${tree.meta.title}`,
          react: InactivityRelaunchEmail({
            userName,
            programTitle: tree.meta.title,
            programUrl,
            nextUnitLabel,
            progressPercent,
            variant,
          }),
          tag: emailType,
        });
        if (result.ok) {
          await markEmailSent({
            userId: candidate.userId,
            emailType,
            programSlug: candidate.programSlug,
          });
          if (variant === 1) stats.relaunch1Sent += 1;
          else stats.relaunch2Sent += 1;
        }
      } catch (e) {
        stats.errors.push({
          userId: candidate.userId,
          programSlug: candidate.programSlug,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    for (const c of window1) await processCandidate(c, 1);
    for (const c of window2) await processCandidate(c, 2);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e), stats },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - startedAt,
    ...stats,
  });
}
