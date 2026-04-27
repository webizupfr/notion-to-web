import 'server-only';

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

import { db, enrollments, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { getProgramTree } from '@/lib/programs';
import { getProgramProgress } from '@/lib/db/progress';
import { buildDayEntriesFromProgram, unitLabelsFor } from '@/lib/program-nav';
import { sendEmail, isEmailConfigured } from '@/lib/email/resend';
import { unitUnlockedEmail } from '@/lib/email/templates';
import { getBaseUrl } from '@/lib/base-url';
import type { ProgramType } from '@/lib/db';

/**
 * Cron quotidien : envoie un email à chaque user dont une unité vient de
 * débloquer aujourd'hui (drip individuel async).
 *
 *   GET  ?secret=CRON_SECRET                     (manuel / curl)
 *   GET  Authorization: Bearer CRON_SECRET       (Vercel Cron)
 *
 * Algorithme :
 *   1. List tous les enrollments actifs (non completedAt)
 *   2. Pour chaque enrollment :
 *      a. Fetch le tree du programme (KV cached)
 *      b. Calcule la "prochaine unit non-complétée" via buildDayEntriesFromProgram
 *      c. Si cette unit se débloque aujourd'hui (unlockDate = today Paris) → envoie l'email
 *      d. Dédup via KV : `email:sent:unit-unlock:{userId}:{unitNotionId}`
 *   3. Skip si Resend pas configuré.
 *
 * Appelle ce endpoint une fois par jour via Vercel Cron.
 */

export const runtime = 'nodejs';
export const maxDuration = 300;

const CRON_SECRET = process.env.CRON_SECRET;

function hasKv(): boolean {
  return Boolean(process.env.KV_REST_API_URL || process.env.KV_URL);
}

function isAuthorizedCron(request: Request): boolean {
  if (!CRON_SECRET) return false;
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader === `Bearer ${CRON_SECRET}`) return true;
  const secret = new URL(request.url).searchParams.get('secret');
  if (secret === CRON_SECRET) return true;
  return false;
}

/** Retourne YYYY-MM-DD en timezone Europe/Paris (pour comparer avec unlockDate). */
function todayKeyParis(): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function dateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = iso.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

type SendStat = {
  userId: string;
  programSlug: string;
  unitSlug: string;
  sent: boolean;
  reason?: string;
};

async function run(): Promise<{
  ok: boolean;
  enrollmentsProcessed: number;
  emailsSent: number;
  skipped: number;
  errors: number;
  durationMs: number;
  samples: SendStat[];
}> {
  const startedAt = Date.now();
  const stats: SendStat[] = [];
  let sent = 0;
  let skipped = 0;
  let errors = 0;

  if (!isEmailConfigured()) {
    return {
      ok: false,
      enrollmentsProcessed: 0,
      emailsSent: 0,
      skipped: 0,
      errors: 0,
      durationMs: Date.now() - startedAt,
      samples: [{ userId: '-', programSlug: '-', unitSlug: '-', sent: false, reason: 'resend_not_configured' }],
    };
  }

  const today = todayKeyParis();
  const baseUrl = getBaseUrl();

  // 1. List enrollments actifs (pas complètement terminés)
  //    On fetch tous + on ignore ceux avec completedAt.
  const allEnrollments = await db.select().from(enrollments);
  const active = allEnrollments.filter((e) => !e.completedAt);

  // Cache : 1 tree par programSlug (évite refetch)
  const treeCache = new Map<string, Awaited<ReturnType<typeof getProgramTree>>>();
  // Cache : 1 email par userId (évite re-fetch users table)
  const userCache = new Map<string, { email: string | null; name: string | null } | null>();

  for (const enrollment of active) {
    try {
      // Fetch tree
      let tree = treeCache.get(enrollment.programSlug);
      if (tree === undefined) {
        tree = await getProgramTree(enrollment.programSlug);
        treeCache.set(enrollment.programSlug, tree);
      }
      if (!tree || tree.units.length === 0) {
        skipped += 1;
        continue;
      }

      // Fetch user
      let user = userCache.get(enrollment.userId);
      if (user === undefined) {
        const rows = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(eq(users.id, enrollment.userId))
          .limit(1);
        user = rows[0]
          ? { email: rows[0].email ?? null, name: rows[0].name ?? null }
          : null;
        userCache.set(enrollment.userId, user);
      }
      if (!user?.email) {
        skipped += 1;
        continue;
      }

      // Build days (avec state unlock calculé via enrolledAt)
      const progress = await getProgramProgress({
        userId: enrollment.userId,
        programType: enrollment.programType as ProgramType,
        programSlug: enrollment.programSlug,
        cohortSlug: enrollment.cohortSlug,
      });
      const completedSet = new Set(
        progress.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
      );
      const enrolledAt = enrollment.startedAt ?? enrollment.enrolledAt;
      const days = buildDayEntriesFromProgram({
        tree,
        enrolledAt,
        basePath: `programs/${enrollment.programSlug}`,
        completedUnitIds: completedSet,
      });

      // Trouve la 1re unit non-complétée dont l'unlockDate est AUJOURD'HUI
      const todayUnlock = days.find((d) => {
        if (d.completed) return false;
        const key = dateKeyFromIso(d.unlockDate);
        return key === today;
      });
      if (!todayUnlock) {
        skipped += 1;
        continue;
      }

      // Dédup KV
      const flagKey = `email:sent:unit-unlock:${enrollment.userId}:${todayUnlock.id}`;
      if (hasKv()) {
        const already = await kv.get(flagKey);
        if (already) {
          skipped += 1;
          stats.push({
            userId: enrollment.userId,
            programSlug: enrollment.programSlug,
            unitSlug: todayUnlock.slug,
            sent: false,
            reason: 'already_sent',
          });
          continue;
        }
      }

      // Envoie l'email
      const labels = unitLabelsFor(tree.meta.type);
      const unitUrl = `${baseUrl}/${todayUnlock.slug}`;
      const tmpl = unitUnlockedEmail({
        recipientName: user.name,
        programTitle: tree.meta.title,
        unitLabel: labels.singular,
        unitOrder: todayUnlock.order,
        unitTitle: todayUnlock.title,
        unitUrl,
      });
      const result = await sendEmail({
        to: user.email,
        subject: tmpl.subject,
        html: tmpl.html,
        text: tmpl.text,
        tag: 'unit-unlock',
      });

      if (result.ok) {
        sent += 1;
        if (hasKv()) {
          // TTL 30 jours : on ne renverra plus ce même unlock même si le cron re-tourne
          await kv.set(flagKey, new Date().toISOString(), { ex: 60 * 60 * 24 * 30 });
        }
        stats.push({
          userId: enrollment.userId,
          programSlug: enrollment.programSlug,
          unitSlug: todayUnlock.slug,
          sent: true,
        });
      } else {
        errors += 1;
        stats.push({
          userId: enrollment.userId,
          programSlug: enrollment.programSlug,
          unitSlug: todayUnlock.slug,
          sent: false,
          reason: result.error,
        });
      }
    } catch (e) {
      errors += 1;
      console.error('[daily-unlocks] error for enrollment', enrollment.id, e);
    }
  }

  return {
    ok: errors === 0,
    enrollmentsProcessed: active.length,
    emailsSent: sent,
    skipped,
    errors,
    durationMs: Date.now() - startedAt,
    samples: stats.slice(0, 20),
  };
}

export async function GET(request: Request) {
  if (!CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET missing on server' }, { status: 500 });
  }
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await run();
    return NextResponse.json(result, { status: result.ok ? 200 : 207 });
  } catch (error) {
    console.error('[daily-unlocks] fatal', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
