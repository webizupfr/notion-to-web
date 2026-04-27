import 'server-only';

import { sql, and, gte, lte, eq, isNull, isNotNull } from 'drizzle-orm';

import { db, enrollments, purchases, progress, users } from '@/lib/db';

/**
 * Helpers analytics admin — toutes les agrégations en SQL côté Postgres.
 *
 * Pas de calcul client : on récupère directement les données prêtes-à-rendre.
 * Si la DB grossit beaucoup (>100k rows), envisager des materialized views.
 */

export type DateRange = {
  from: Date | null;
  to: Date | null;
};

/** Helpers pour construire les ranges depuis un slug user-facing. */
export type RangeKey = '7d' | '30d' | '90d' | '12m' | 'all';

export function rangeFromKey(key: RangeKey): DateRange {
  const now = new Date();
  if (key === 'all') return { from: null, to: null };
  const from = new Date(now);
  if (key === '7d') from.setDate(from.getDate() - 7);
  else if (key === '30d') from.setDate(from.getDate() - 30);
  else if (key === '90d') from.setDate(from.getDate() - 90);
  else if (key === '12m') from.setMonth(from.getMonth() - 12);
  return { from, to: now };
}

// ─── KPIs (4 cards en haut) ────────────────────────────────────────────────

export type Kpis = {
  totalLearners: number;
  totalRevenueCents: number;
  thisMonthRevenueCents: number;
  averageCompletionRate: number; // 0-100
};

export async function getKpis(range: DateRange): Promise<Kpis> {
  const fromCondPurchase = range.from
    ? gte(purchases.createdAt, range.from)
    : undefined;
  const toCondPurchase = range.to ? lte(purchases.createdAt, range.to) : undefined;

  // Total learners (enrolled au moins 1 programme dans le range)
  const fromCondEnroll = range.from
    ? gte(enrollments.enrolledAt, range.from)
    : undefined;
  const toCondEnroll = range.to ? lte(enrollments.enrolledAt, range.to) : undefined;

  const [learnersRow] = await db
    .select({
      count: sql<number>`count(distinct ${enrollments.userId})::int`,
    })
    .from(enrollments)
    .where(and(...[fromCondEnroll, toCondEnroll].filter(Boolean)));

  // Total revenue (somme purchase.amount, exclu refunded)
  const [revRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${purchases.amount}), 0)::int`,
    })
    .from(purchases)
    .where(
      and(
        isNull(purchases.refundedAt),
        ...[fromCondPurchase, toCondPurchase].filter(Boolean),
      ),
    );

  // Revenue ce mois (depuis le 1er du mois en cours, indépendant du range filter)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [thisMonthRow] = await db
    .select({
      total: sql<number>`coalesce(sum(${purchases.amount}), 0)::int`,
    })
    .from(purchases)
    .where(
      and(
        isNull(purchases.refundedAt),
        gte(purchases.createdAt, startOfMonth),
      ),
    );

  // Taux complétion moyen : (count enrollments completed) / (count enrollments total) × 100
  const [enrollStatsRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${enrollments.completedAt} is not null)::int`,
    })
    .from(enrollments)
    .where(and(...[fromCondEnroll, toCondEnroll].filter(Boolean)));

  const avgCompletion =
    enrollStatsRow && enrollStatsRow.total > 0
      ? Math.round((enrollStatsRow.completed / enrollStatsRow.total) * 100)
      : 0;

  return {
    totalLearners: Number(learnersRow?.count ?? 0),
    totalRevenueCents: Number(revRow?.total ?? 0),
    thisMonthRevenueCents: Number(thisMonthRow?.total ?? 0),
    averageCompletionRate: avgCompletion,
  };
}

// ─── Inscriptions dans le temps (line chart) ───────────────────────────────

export type EnrollmentPoint = {
  /** Format YYYY-MM-DD */
  date: string;
  count: number;
};

/**
 * Compte les nouvelles inscriptions par jour sur la période.
 * Granularité : jour. Si range = 12m → jour aussi (peut faire ~365 points).
 * Pour scaler : agréger par semaine ou mois si range > 90 jours.
 */
export async function getEnrollmentsOverTime(
  range: DateRange,
): Promise<EnrollmentPoint[]> {
  const fromCond = range.from
    ? gte(enrollments.enrolledAt, range.from)
    : undefined;
  const toCond = range.to ? lte(enrollments.enrolledAt, range.to) : undefined;

  const rows = await db
    .select({
      date: sql<string>`to_char(${enrollments.enrolledAt}, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(enrollments)
    .where(and(...[fromCond, toCond].filter(Boolean)))
    .groupBy(sql`to_char(${enrollments.enrolledAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`to_char(${enrollments.enrolledAt}, 'YYYY-MM-DD')`);

  return rows.map((r) => ({ date: r.date, count: Number(r.count) }));
}

// ─── Revenus par mois (bar chart) ───────────────────────────────────────────

export type RevenuePoint = {
  /** Format YYYY-MM */
  month: string;
  revenueCents: number;
  /** Nb d'achats ce mois */
  count: number;
};

export async function getRevenuePerMonth(months = 12): Promise<RevenuePoint[]> {
  const from = new Date();
  from.setMonth(from.getMonth() - months);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      month: sql<string>`to_char(${purchases.createdAt}, 'YYYY-MM')`,
      revenueCents: sql<number>`coalesce(sum(${purchases.amount}), 0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(purchases)
    .where(and(isNull(purchases.refundedAt), gte(purchases.createdAt, from)))
    .groupBy(sql`to_char(${purchases.createdAt}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${purchases.createdAt}, 'YYYY-MM')`);

  return rows.map((r) => ({
    month: r.month,
    revenueCents: Number(r.revenueCents),
    count: Number(r.count),
  }));
}

// ─── Top programmes (bar chart horizontal) ─────────────────────────────────

export type ProgramRanking = {
  programSlug: string;
  enrollments: number;
  completed: number;
  revenueCents: number;
};

export async function getTopPrograms(limit = 10): Promise<ProgramRanking[]> {
  // Aggregate enrollments par programme
  const enrollRows = await db
    .select({
      programSlug: enrollments.programSlug,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${enrollments.completedAt} is not null)::int`,
    })
    .from(enrollments)
    .groupBy(enrollments.programSlug);

  // Aggregate revenue par programme
  const revRows = await db
    .select({
      programSlug: purchases.programSlug,
      revenueCents: sql<number>`coalesce(sum(${purchases.amount}), 0)::int`,
    })
    .from(purchases)
    .where(isNull(purchases.refundedAt))
    .groupBy(purchases.programSlug);

  const revMap = new Map(revRows.map((r) => [r.programSlug, Number(r.revenueCents)]));

  return enrollRows
    .map((r) => ({
      programSlug: r.programSlug,
      enrollments: Number(r.total),
      completed: Number(r.completed),
      revenueCents: revMap.get(r.programSlug) ?? 0,
    }))
    .sort((a, b) => b.enrollments - a.enrollments)
    .slice(0, limit);
}

// ─── Dropoff par unit (pour un programme spécifique) ───────────────────────

export type UnitDropoff = {
  /** activityNotionId (key) */
  activityNotionId: string;
  /** activitySlug humain */
  activitySlug: string | null;
  completedCount: number;
};

/**
 * Pour un programme donné, retourne le nombre d'apprenants qui ont COMPLÉTÉ
 * chaque unit. Lu directement depuis `progress` (pas besoin du tree Notion).
 *
 * Pour rendre joli côté front, faire join avec `tree.units` pour l'ordre/titre.
 */
export async function getDropoffPerUnit(
  programSlug: string,
): Promise<UnitDropoff[]> {
  const rows = await db
    .select({
      activityNotionId: progress.activityNotionId,
      activitySlug: progress.activitySlug,
      completedCount: sql<number>`count(*)::int`,
    })
    .from(progress)
    .where(
      and(
        eq(progress.programSlug, programSlug),
        eq(progress.status, 'completed'),
      ),
    )
    .groupBy(progress.activityNotionId, progress.activitySlug);

  return rows.map((r) => ({
    activityNotionId: r.activityNotionId,
    activitySlug: r.activitySlug,
    completedCount: Number(r.completedCount),
  }));
}

// ─── Liste des programmes pour le sélecteur (dropoff) ──────────────────────

export async function getEnrolledProgramSlugs(): Promise<string[]> {
  const rows = await db
    .select({ programSlug: enrollments.programSlug })
    .from(enrollments)
    .groupBy(enrollments.programSlug);
  return rows.map((r) => r.programSlug);
}

// ─── Export CSV enrollments (pour endpoint admin) ──────────────────────────

export type EnrollmentExport = {
  email: string;
  name: string | null;
  programSlug: string;
  programType: string;
  cohortSlug: string | null;
  enrolledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
};

export async function getEnrollmentsForExport(
  programSlug: string,
): Promise<EnrollmentExport[]> {
  const rows = await db
    .select({
      email: users.email,
      name: users.name,
      programSlug: enrollments.programSlug,
      programType: enrollments.programType,
      cohortSlug: enrollments.cohortSlug,
      enrolledAt: enrollments.enrolledAt,
      startedAt: enrollments.startedAt,
      completedAt: enrollments.completedAt,
      lastActivityAt: enrollments.lastActivityAt,
    })
    .from(enrollments)
    .innerJoin(users, eq(enrollments.userId, users.id))
    .where(eq(enrollments.programSlug, programSlug))
    .orderBy(enrollments.enrolledAt);

  // Exclure éventuels users sans email (devrait pas arriver mais filet de sécurité)
  return rows
    .filter((r): r is typeof r & { email: string } => Boolean(r.email))
    .map((r) => ({
      email: r.email,
      name: r.name,
      programSlug: r.programSlug,
      programType: r.programType,
      cohortSlug: r.cohortSlug,
      enrolledAt: r.enrolledAt.toISOString(),
      startedAt: r.startedAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      lastActivityAt: r.lastActivityAt?.toISOString() ?? null,
    }));
}

// Bypass unused warnings if some helpers aren't called yet
void isNotNull;
