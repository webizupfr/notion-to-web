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
    /** Dernière activité significative — visite d'unit, complétion, etc.
     * Utilisé par les crons d'inactivité pour détecter les apprenants en stand-by. */
    lastActivityAt: timestamp('last_activity_at', { mode: 'date' }),
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
    /** Stripe `invoice.hosted_invoice_url` — page hosted Stripe (PDF + détails) */
    invoiceUrl: text('invoice_url'),
    /** Stripe `invoice.invoice_pdf` — URL du PDF directement téléchargeable */
    invoicePdfUrl: text('invoice_pdf_url'),
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

// ─────────── email_sent (idempotence triggers) ───────────

/**
 * Trace de chaque email transactionnel envoyé pour éviter les doublons.
 *
 * Idempotence : 1 row par (userId, emailType, programSlug nullable).
 * Avant d'envoyer un email, on check si la row existe déjà → si oui, skip.
 *
 * Ex de emailType :
 *   - "session-reminder-j-1"   (rappel J-1 d'un programme sync)
 *   - "session-reminder-j0"    (rappel matin J0)
 *   - "inactivity-relaunch-1"  (1ère relance ~7 jours)
 *   - "inactivity-relaunch-2"  (2ème relance ~14 jours)
 *   - "certificate-ready"      (programme terminé)
 *   - "program-completed"      (alternative à certificate-ready)
 */
export const emailSent = pgTable(
  'email_sent',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Identifiant logique du template (ex: "inactivity-relaunch-1") */
    emailType: text('email_type').notNull(),
    /** Slug du programme concerné (nullable pour emails non liés à un programme) */
    programSlug: text('program_slug'),
    sentAt: timestamp('sent_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('email_sent_unique').on(t.userId, t.emailType, t.programSlug),
    index('email_sent_user_idx').on(t.userId),
  ],
);

// ─────────── certificates ───────────

/**
 * Certificats de complétion délivrés.
 *
 * Source de vérité pour la page publique /cert/verify/[code] : si le code
 * matche une row ici, le certificat est valide.
 *
 * Idempotence : un user a au max 1 certificat par programme. Si la row existe,
 * on reuse le code (pas de re-génération à chaque téléchargement du PDF).
 */
export const certificates = pgTable(
  'certificate',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    programSlug: text('program_slug').notNull(),
    /** Code public stable utilisé dans l'URL /cert/verify/[code]. UNIQUE. */
    code: text('code').notNull(),
    /** Snapshot du nom de l'apprenant au moment de l'émission (en cas de modif user.name plus tard). */
    recipientName: text('recipient_name').notNull(),
    /** Snapshot du titre du programme. */
    programTitle: text('program_title').notNull(),
    /** Date de complétion = date du dernier `progress.completedAt` */
    completedAt: timestamp('completed_at', { mode: 'date' }).notNull(),
    issuedAt: timestamp('issued_at', { mode: 'date' }).defaultNow().notNull(),
    /** Si le certificat est révoqué (ex: refund) → page /verify renvoie 410. */
    revokedAt: timestamp('revoked_at', { mode: 'date' }),
  },
  (t) => [
    uniqueIndex('certificate_code_unique').on(t.code),
    uniqueIndex('certificate_user_program_unique').on(t.userId, t.programSlug),
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
export type Certificate = typeof certificates.$inferSelect;
export type NewCertificate = typeof certificates.$inferInsert;
export type EmailSent = typeof emailSent.$inferSelect;
export type NewEmailSent = typeof emailSent.$inferInsert;
export type ProgressStatus = 'unlocked' | 'started' | 'completed';
export type ProgramType = 'async' | 'sync' | 'event';
