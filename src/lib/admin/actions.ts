"use server";

import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import { db, users, progress, enrollments } from '@/lib/db';
import { requireAdmin } from './guard';

/** Bascule role admin ↔ learner sur un user. */
export async function toggleUserRole(userId: string) {
  await requireAdmin();
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) throw new Error('user not found');
  const nextRole = u.role === 'admin' ? 'learner' : 'admin';
  await db.update(users).set({ role: nextRole }).where(eq(users.id, userId));
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath('/admin');
}

/** Supprime toutes les progressions d'un user (garde enrollments). */
export async function resetUserProgress(userId: string) {
  await requireAdmin();
  await db.delete(progress).where(eq(progress.userId, userId));
  revalidatePath(`/admin/users/${userId}`);
}

/** Supprime une enrollment spécifique (et sa progression liée). */
export async function unenrollUser(enrollmentId: string) {
  await requireAdmin();
  const [e] = await db.select().from(enrollments).where(eq(enrollments.id, enrollmentId)).limit(1);
  if (!e) return;
  // Clean progress attachée à ce user+program
  await db
    .delete(progress)
    .where(and(eq(progress.userId, e.userId), eq(progress.programSlug, e.programSlug)));
  await db.delete(enrollments).where(eq(enrollments.id, enrollmentId));
  revalidatePath(`/admin/users/${e.userId}`);
  revalidatePath('/admin');
}
