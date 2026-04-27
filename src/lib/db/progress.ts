import 'server-only';

import { eq, and, sql } from 'drizzle-orm';
import { db, enrollments, progress } from '@/lib/db';
import type { ProgramType, ProgressStatus } from '@/lib/db';

/**
 * Inscrit un user à un programme (idempotent).
 * Retourne `{ enrollment, created: true }` si nouvelle inscription,
 * `{ enrollment, created: false }` si déjà inscrit.
 */
export async function enrollUser(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
  cohortSlug?: string | null;
}) {
  const { userId, programType, programSlug, cohortSlug = null } = opts;

  const existing = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.programType, programType),
        eq(enrollments.programSlug, programSlug),
        cohortSlug === null
          ? sql`${enrollments.cohortSlug} IS NULL`
          : eq(enrollments.cohortSlug, cohortSlug),
      ),
    )
    .limit(1);

  if (existing[0]) return { enrollment: existing[0], created: false };

  const [created] = await db
    .insert(enrollments)
    .values({ userId, programType, programSlug, cohortSlug })
    .returning();

  return { enrollment: created, created: true };
}

/**
 * Liste les programmes d'un utilisateur (hubs + sprints).
 */
export async function listUserEnrollments(userId: string) {
  return db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .orderBy(enrollments.enrolledAt);
}

/**
 * Vérifie si un utilisateur est enrollé à un programme.
 */
export async function isEnrolled(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
}): Promise<boolean> {
  const { userId, programType, programSlug } = opts;
  const rows = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.programType, programType),
        eq(enrollments.programSlug, programSlug),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Récupère l'enrollment d'un user pour un programme (ou null).
 * Utile pour connaître `enrolledAt` / `startedAt` (progression par jour).
 */
export async function getEnrollment(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
  cohortSlug?: string | null;
}) {
  const { userId, programType, programSlug, cohortSlug = null } = opts;
  const rows = await db
    .select()
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.programType, programType),
        eq(enrollments.programSlug, programSlug),
        cohortSlug === null
          ? sql`${enrollments.cohortSlug} IS NULL`
          : eq(enrollments.cohortSlug, cohortSlug),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Marque une activité comme complétée (idempotent).
 */
export async function completeActivity(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
  cohortSlug?: string | null;
  activityNotionId: string;
  activitySlug?: string | null;
}) {
  const { userId, programType, programSlug, cohortSlug = null, activityNotionId, activitySlug = null } = opts;
  const now = new Date();

  const existing = await db
    .select()
    .from(progress)
    .where(
      and(
        eq(progress.userId, userId),
        eq(progress.activityNotionId, activityNotionId),
        cohortSlug === null
          ? sql`${progress.cohortSlug} IS NULL`
          : eq(progress.cohortSlug, cohortSlug),
      ),
    )
    .limit(1);

  if (existing[0]) {
    if (existing[0].status === 'completed') return existing[0];
    const [updated] = await db
      .update(progress)
      .set({ status: 'completed' as ProgressStatus, completedAt: now, updatedAt: now })
      .where(eq(progress.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(progress)
    .values({
      userId,
      programType,
      programSlug,
      cohortSlug,
      activityNotionId,
      activitySlug,
      status: 'completed' as ProgressStatus,
      startedAt: now,
      completedAt: now,
    })
    .returning();
  return created;
}

/**
 * Récupère la progression d'un user pour un programme (toutes activités).
 */
export async function getProgramProgress(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
  cohortSlug?: string | null;
}) {
  const { userId, programType, programSlug, cohortSlug = null } = opts;
  return db
    .select()
    .from(progress)
    .where(
      and(
        eq(progress.userId, userId),
        eq(progress.programType, programType),
        eq(progress.programSlug, programSlug),
        cohortSlug === null
          ? sql`${progress.cohortSlug} IS NULL`
          : eq(progress.cohortSlug, cohortSlug),
      ),
    )
    .orderBy(progress.updatedAt);
}

/**
 * Compte activités complétées + total pour un programme → permet % de progression.
 */
export async function countCompleted(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
  cohortSlug?: string | null;
}): Promise<number> {
  const { userId, programType, programSlug, cohortSlug = null } = opts;
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(progress)
    .where(
      and(
        eq(progress.userId, userId),
        eq(progress.programType, programType),
        eq(progress.programSlug, programSlug),
        eq(progress.status, 'completed'),
        cohortSlug === null
          ? sql`${progress.cohortSlug} IS NULL`
          : eq(progress.cohortSlug, cohortSlug),
      ),
    );
  return Number(result[0]?.count ?? 0);
}

/**
 * Met à jour le `lastActivityAt` d'un enrollment (et optionnellement `completedAt`).
 * Idempotent : si déjà complété et qu'on rappelle avec completedAt, on ne touche pas.
 */
export async function touchEnrollmentActivity(opts: {
  userId: string;
  programType: ProgramType;
  programSlug: string;
  cohortSlug?: string | null;
  /** Si true, marque aussi `completedAt = now()` (et `startedAt` si null). */
  markCompleted?: boolean;
}): Promise<void> {
  const { userId, programType, programSlug, cohortSlug = null, markCompleted = false } = opts;
  const now = new Date();
  const setObj: Partial<typeof enrollments.$inferInsert> = { lastActivityAt: now };
  if (markCompleted) {
    setObj.completedAt = now;
    setObj.startedAt = setObj.startedAt ?? now;
  }
  await db
    .update(enrollments)
    .set(setObj)
    .where(
      and(
        eq(enrollments.userId, userId),
        eq(enrollments.programType, programType),
        eq(enrollments.programSlug, programSlug),
        cohortSlug === null
          ? sql`${enrollments.cohortSlug} IS NULL`
          : eq(enrollments.cohortSlug, cohortSlug),
      ),
    );
}
