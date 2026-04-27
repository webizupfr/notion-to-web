import 'server-only';

import { NextResponse } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';

import { db, enrollments, users } from '@/lib/db';
import { listAllProgramsFromNotion, getProgramBySlug } from '@/lib/programs';
import { sendReactEmail, isEmailConfigured } from '@/lib/email/resend';
import { SessionReminderEmail } from '@/components/emails/SessionReminder';
import { wasEmailSent, markEmailSent } from '@/lib/db/email-sent';
import { getBaseUrl } from '@/lib/base-url';

/**
 * Cron quotidien : envoie les rappels de session pour les programmes `sync` et
 * `event` qui démarrent le lendemain (J-1) ou aujourd'hui (J0 matin).
 *
 *   GET /api/emails/session-reminders?secret=CRON_SECRET
 *
 * Schedule recommandé : quotidien à 5h UTC (= 7h Paris été, 6h hiver).
 * Idempotence garantie via la table `email_sent` (1 envoi par
 * user × programme × variant J-1/J0).
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

/** Date au format YYYY-MM-DD dans la TZ Europe/Paris. */
function dateKeyParis(d: Date): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Format date FR longue : "lundi 5 mai 2026" */
function formatFrDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Paris',
  });
}

/** Heure FR : "10h00" */
function formatFrTime(d: Date): string {
  return d
    .toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    })
    .replace(':', 'h');
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { ok: false, message: 'Email not configured (AUTH_RESEND_KEY)' },
      { status: 500 },
    );
  }

  const startedAt = Date.now();
  const stats = {
    programsChecked: 0,
    j1Sent: 0,
    j0Sent: 0,
    skipped: 0,
    errors: [] as Array<{ slug: string; error: string }>,
  };

  try {
    const todayKey = dateKeyParis(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = dateKeyParis(tomorrow);

    // 1. Liste tous les programmes avec une startDatetime
    const allMetas = await listAllProgramsFromNotion();
    const candidates = allMetas.filter(
      (p) => (p.type === 'sync' || p.type === 'event') && p.startDatetime,
    );

    for (const metaShort of candidates) {
      stats.programsChecked += 1;
      const programSlug = metaShort.slug;
      try {
        const meta = await getProgramBySlug(programSlug);
        if (!meta?.startDatetime) {
          stats.skipped += 1;
          continue;
        }

        const startDate = new Date(meta.startDatetime);
        const startKey = dateKeyParis(startDate);

        let variant: 'j-1' | 'j0' | null = null;
        if (startKey === tomorrowKey) variant = 'j-1';
        else if (startKey === todayKey) variant = 'j0';
        if (!variant) {
          stats.skipped += 1;
          continue;
        }

        const emailType = variant === 'j-1' ? 'session-reminder-j-1' : 'session-reminder-j0';

        // Liste les enrollments actifs sur ce programme (pas complétés)
        const rows = await db
          .select({
            userId: users.id,
            email: users.email,
            name: users.name,
          })
          .from(enrollments)
          .innerJoin(users, eq(enrollments.userId, users.id))
          .where(
            and(
              eq(enrollments.programSlug, programSlug),
              eq(enrollments.programType, meta.type),
              isNull(enrollments.completedAt),
            ),
          );

        const baseUrl = getBaseUrl();
        const programUrl = `${baseUrl}/programs/${programSlug}`;
        const startDateStr = formatFrDate(startDate);
        const startTimeStr = formatFrTime(startDate);

        for (const r of rows) {
          if (!r.email) continue;
          if (
            await wasEmailSent({
              userId: r.userId,
              emailType,
              programSlug,
            })
          ) {
            continue;
          }

          const userName = r.name?.trim() || r.email.split('@')[0];
          const result = await sendReactEmail({
            to: r.email,
            subject:
              variant === 'j-1'
                ? `Demain on démarre — ${meta.title}`
                : `C'est le jour J — ${meta.title} 🚀`,
            react: SessionReminderEmail({
              userName,
              programTitle: meta.title,
              programUrl,
              startDate: startDateStr,
              startTime: startTimeStr,
              variant,
            }),
            tag: emailType,
          });
          if (result.ok) {
            await markEmailSent({ userId: r.userId, emailType, programSlug });
            if (variant === 'j-1') stats.j1Sent += 1;
            else stats.j0Sent += 1;
          }
        }
      } catch (e) {
        stats.errors.push({
          slug: programSlug,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
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
