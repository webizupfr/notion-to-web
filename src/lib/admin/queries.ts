import 'server-only';

import { eq, sql, desc, and } from 'drizzle-orm';
import { db, users, enrollments, progress } from '@/lib/db';

/** Overview global : compte users, enrollments, completions */
export async function getOverview() {
  const [usersCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(users);
  const [enrollCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(enrollments);
  const [completedCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(progress)
    .where(eq(progress.status, 'completed'));
  const [activeEnrollCount] = await db
    .select({ n: sql<number>`count(*)` })
    .from(enrollments)
    .where(sql`${enrollments.completedAt} IS NULL`);

  return {
    totalUsers: Number(usersCount?.n ?? 0),
    totalEnrollments: Number(enrollCount?.n ?? 0),
    activeEnrollments: Number(activeEnrollCount?.n ?? 0),
    totalCompletedActivities: Number(completedCount?.n ?? 0),
  };
}

/** Liste users + compteurs */
export async function listUsersWithStats() {
  // Jointure manuelle : users + count(enrollments) + count(completed progress)
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
      emailVerified: users.emailVerified,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Pour chaque user, count enrollments + completed
  const enriched = await Promise.all(
    rows.map(async (u) => {
      const [ec] = await db
        .select({ n: sql<number>`count(*)` })
        .from(enrollments)
        .where(eq(enrollments.userId, u.id));
      const [cc] = await db
        .select({ n: sql<number>`count(*)` })
        .from(progress)
        .where(and(eq(progress.userId, u.id), eq(progress.status, 'completed')));
      return {
        ...u,
        enrollmentCount: Number(ec?.n ?? 0),
        completedCount: Number(cc?.n ?? 0),
      };
    }),
  );
  return enriched;
}

/** Stats par programme (combien de users enrollés / actifs) */
export async function listProgramStats() {
  const rows = await db
    .select({
      programType: enrollments.programType,
      programSlug: enrollments.programSlug,
      enrolled: sql<number>`count(*)`,
      completed: sql<number>`count(${enrollments.completedAt})`,
    })
    .from(enrollments)
    .groupBy(enrollments.programType, enrollments.programSlug)
    .orderBy(desc(sql`count(*)`));

  return rows.map((r) => ({
    programType: r.programType,
    programSlug: r.programSlug,
    enrolled: Number(r.enrolled),
    completed: Number(r.completed),
  }));
}

/** Détail user + ses enrollments + progress par programme */
export async function getUserDetail(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return null;

  const userEnrollments = await db
    .select()
    .from(enrollments)
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.enrolledAt));

  const userProgress = await db
    .select()
    .from(progress)
    .where(eq(progress.userId, userId))
    .orderBy(desc(progress.updatedAt));

  return { user, enrollments: userEnrollments, progress: userProgress };
}
