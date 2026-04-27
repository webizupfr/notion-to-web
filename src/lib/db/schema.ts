/**
 * Drizzle schema — Neon Postgres.
 *
 * Contient :
 *  1. Tables NextAuth (users, accounts, sessions, verificationTokens)
 *  2. Tables LMS (enrollments, progress)
 *
 * Unification hub/sprint : `program_type` discriminator sur enrollments + progress,
 * les données Notion (title, cover, etc.) restent dans KV / Notion — ici on ne
 * stocke que l'état user.
 */

import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

// ─────────── NextAuth tables (Drizzle Adapter) ───────────

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  // LMS extensions
  role: text('role', { enum: ['learner', 'admin'] }).default('learner').notNull(),
  createdAt: timestamp('createdAt', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (v) => [primaryKey({ columns: [v.identifier, v.token] })],
);

// ─────────── LMS domain ───────────

// V2 : async (hubs) · sync (sprints programmés) · event (one-shot)
export const programTypeEnum = pgEnum('program_type', ['async', 'sync', 'event']);
export const progressStatusEnum = pgEnum('progress_status', ['unlocked', 'started', 'completed']);

/**
 * Un utilisateur inscrit à un programme (hub ou sprint).
 * Pour les hubs, peut aussi avoir une cohort_key (slug de cohorte). null = accès hors cohorte.
 */
export const enrollments = pgTable(
  'enrollment',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    programType: programTypeEnum('program_type').notNull(),
    programSlug: text('program_slug').notNull(),
    cohortSlug: text('cohort_slug'),
    enrolledAt: timestamp('enrolled_at', { mode: 'date' }).defaultNow().notNull(),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
  },
  (t) => [
    uniqueIndex('enrollment_user_program_unique').on(t.userId, t.programType, t.programSlug, t.cohortSlug),
    index('enrollment_user_idx').on(t.userId),
    index('enrollment_program_idx').on(t.programType, t.programSlug),
  ],
);

/**
 * État d'une activité (étape/block) pour un utilisateur.
 * activityNotionId = page ID Notion de l'activité (jour, module, step).
 * activitySlug = slug humain lisible (debug/logs).
 */
export const progress = pgTable(
  'progress',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    programType: programTypeEnum('program_type').notNull(),
    programSlug: text('program_slug').notNull(),
    cohortSlug: text('cohort_slug'),
    /** Page ID Notion de l'activité/jour/module (clé stable) */
    activityNotionId: text('activity_notion_id').notNull(),
    /** Slug lisible (ex: j02, module-intro) — indicatif */
    activitySlug: text('activity_slug'),
    status: progressStatusEnum('status').notNull().default('unlocked'),
    startedAt: timestamp('started_at', { mode: 'date' }),
    completedAt: timestamp('completed_at', { mode: 'date' }),
    updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('progress_user_activity_unique').on(t.userId, t.activityNotionId, t.cohortSlug),
    index('progress_user_program_idx').on(t.userId, t.programType, t.programSlug),
  ],
);

/**
 * Achats Stripe d'un programme par un user.
 *
 * Source de vérité = Stripe (sessionId / paymentIntentId).
 * Cette table sert à :
 *   - Vérifier si un user a accès payant à un programme (ex: gating /programs/[slug])
 *   - Retracer l'historique des achats pour l'admin
 *   - Idempotence webhook (1 row par stripe_session_id)
 */
export const purchases = pgTable(
  'purchase',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Slug du programme acheté */
    programSlug: text('program_slug').notNull(),
    /** Type de programme au moment de l'achat (snapshot) */
    programType: programTypeEnum('program_type').notNull(),
    /** Montant en centimes (49€ → 4900) */
    amount: integer('amount').notNull(),
    /** ISO 4217 code, ex: 'EUR' */
    currency: text('currency').notNull().default('EUR'),
    /** ID de la Stripe Checkout Session — UNIQUE pour idempotence webhook */
    stripeSessionId: text('stripe_session_id').notNull(),
    /** PaymentIntent (set après confirmation) */
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    paidAt: timestamp('paid_at', { mode: 'date' }),
    /** Si remboursé : timestamp + raison optionnelle. L'enrollment associé est révoqué. */
    refundedAt: timestamp('refunded_at', { mode: 'date' }),
    refundReason: text('refund_reason'),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('purchase_session_unique').on(t.stripeSessionId),
    index('purchase_user_program_idx').on(t.userId, t.programSlug),
  ],
);

// ─────────── Type exports ───────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Enrollment = typeof enrollments.$inferSelect;
export type NewEnrollment = typeof enrollments.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;
export type ProgressStatus = 'unlocked' | 'started' | 'completed';
export type ProgramType = 'async' | 'sync' | 'event';
