import type {
  DayMeta as DayMetaConfig,
  CohortMeta as CohortMetaConfig,
} from '@/lib/meta-schemas';

// Élément de navigation : section (callout 📌) ou page enfant
export type NavItem = {
  type: 'section' | 'page';
  title: string;
  // Pour les pages
  id?: string;
  slug?: string;
  icon?: string | null;
  // Pour les sections, les pages enfants sous cette section
  children?: Array<{ id: string; title: string; slug: string; icon?: string | null }>;
};

export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
  lastEdited?: string;
  // Univers de positionnement (déterminé par Notion ou par le slug)
  univers?: "studio" | "lab" | "campus";
  // Typologie de page (optionnelle)
  pageType?: "landing" | "article" | "offre" | "programme";
  // Navigation hiérarchique (sections + pages groupées)
  navigation?: NavItem[];
  // Infos du parent (pour afficher la sidebar sur les child pages)
  parentSlug?: string;
  parentTitle?: string;
  parentNavigation?: NavItem[];
  parentIcon?: string | null;
  // Ancien format (deprecated, gardé pour compatibilité)
  childPages?: Array<{ id: string; title: string; slug: string }>;

  // Hubs pédagogiques
  description?: string | null;
  icon?: string | null;
  syncStrategy?: "full" | "shallow" | "deep";
  maxDepth?: number;
  syncPriority?: number;
  isHub?: boolean;
  learningPath?: LearningPath;

  // ── LMS Tier 1 fields (Notion v2026-04 migration) ──
  /** draft = caché du site · published = visible · archived = retiré. null = backward compat (traité comme published) */
  publishingStatus?: "draft" | "published" | "archived" | null;
  /** Image de couverture (Cloudinary URL après mirroring, ou Notion file URL fallback) — OG + hero */
  coverImageUrl?: string | null;
  /** Thumbnail pour cards index (Cloudinary URL) */
  thumbnailUrl?: string | null;
  /** Durée totale estimée du programme en minutes (pour Schema.org Course) */
  estimatedDurationMinutes?: number | null;
  /** Pour qui ce hub/sprint est fait (2-3 lignes) */
  targetAudience?: string | null;
  /** Ce qu'il faut savoir avant (prose ou liste à puces) */
  prerequisites?: string | null;
  /** "À la fin vous saurez X, Y, Z" */
  learningOutcomes?: string | null;
  /** Le programme émet-il un certificat post-complétion ? */
  certificateEnabled?: boolean | null;
  /** Nb max participants (sprints + cohortes) */
  capacity?: number | null;
  /** IDs Notion des instructeurs (relation → DB Instructors) */
  instructorIds?: string[];
  /** Instructors résolus depuis DB Instructors (peuplé par le pipeline sync) */
  instructors?: InstructorMeta[];
};

export type InstructorMeta = {
  /** Page ID Notion */
  id: string;
  name: string;
  bio?: string | null;
  /** URL photo (Cloudinary mirrored) */
  photoUrl?: string | null;
  email?: string | null;
  linkedinUrl?: string | null;
  /** lead / co-instructor / guest */
  role?: string | null;
};

// ═══════════════════════════════════════════════════════════════════════
//  V3 Unified Program model — 1 DB + child pages hiérarchiques
//  Cf. docs/V3_NOTION_IDS.md
// ═══════════════════════════════════════════════════════════════════════

/** Type de programme — détermine comment les units se débloquent. */
export type ProgramType = 'async' | 'sync' | 'event';

/** Tier d'accès au niveau unit (freemium) */
export type AccessTier = 'free' | 'paid' | 'preview';

/** Type de step (activité) */
export type StepType = 'intro' | 'step' | 'conclusion' | 'option';

/**
 * Ressource épinglée (callout 📌 dans le body programme) affichée en sidebar.
 *
 *   kind='internal'  → child_page Notion ou mention de page → rendu nativement
 *                       sur la plateforme via /programs/[slug]/r/[resourceSlug].
 *                       `bodyBlocks` est fetch dans le tree pour rendu instant.
 *   kind='external'  → lien hors plateforme (Slack, Calendly, etc.).
 *                       `url` pointe vers l'URL externe, ouvre dans nouvel onglet.
 */
export type PinnedResource = {
  label: string;
  kind: 'internal' | 'external';
  /** External : URL absolue (https://...). Internal : peut être null. */
  url?: string | null;
  /** Internal : Notion ID de la page (pour fetch les blocs). */
  notionId?: string;
  /** Internal : slug URL-safe (pour /r/[slug]). */
  slug?: string;
  /** Optionnel : emoji ou URL d'icône. */
  icon?: string | null;
  /** Internal : blocs Notion de la page, fetchés et stockés en KV avec le tree. */
  bodyBlocks?: unknown[];
};

/** Program unifié — 12 props essentielles (vs 18 en v2). */
export type ProgramMeta = {
  notionId: string;
  slug: string;
  title: string;
  type: ProgramType;
  description?: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  password?: string | null;
  lastEdited?: string;

  // Publishing gate
  publishingStatus?: 'draft' | 'published' | 'archived' | null;

  // Media
  coverImageUrl?: string | null;
  thumbnailUrl?: string | null;

  // Instructor relation
  instructorIds?: string[];
  /** Resolved lazily by pages that need them */
  instructors?: InstructorMeta[];

  // Scheduling (type=event uniquement)
  startDatetime?: string | null;

  // Certificat
  certificateEnabled?: boolean | null;

  // ── Paywall ──
  /** Prix en EUR (number entier ou décimal). 0 ou null = gratuit. */
  price?: number | null;
  /** ISO 4217. Default 'EUR' si price > 0. */
  currency?: string | null;
};

/**
 * Unit = un "jour" (async) ou un "module" (sync) — child page dans le body du programme.
 * L'ordre est déduit de la position dans Notion, les metadatas depuis le callout ⚙️ Config.
 */
export type UnitMeta = {
  notionId: string;
  slug: string;
  title: string;
  order: number;
  /** Notion ID du programme parent */
  programNotionId: string;
  /** Slug humain du programme parent (pour routing facile) */
  programSlug?: string;
  durationMinutes?: number | null;
  dayIndex?: number | null;
  unlockOffsetDays?: number | null;
  unlockAt?: string | null;
  summary?: string | null;
  accessTier?: AccessTier;
};

/** Step = child page d'une unit. */
export type StepMeta = {
  notionId: string;
  slug: string;
  title: string;
  unitNotionId: string;
  order: number;
  type: StepType;
  durationMinutes?: number | null;
  requiresCheck?: boolean;
};

/**
 * Structure agrégée : program + ses units (avec leurs body blocks) + leurs steps.
 *
 * `bodyBlocks` contient les blocs Notion de la page *hors* callouts ⚙️/📌 et *hors*
 * child_page blocks (qui sont déjà représentés dans `units` / `steps`).
 *
 * Chaque Step embarque aussi ses `bodyBlocks` pour que `ActivityContent` puisse les
 * consommer sans refetch Notion (important pour la perf + pour le stockage KV).
 */
export type ProgramTreeStep = {
  meta: StepMeta;
  bodyBlocks: unknown[];
};

export type ProgramTreeUnit = {
  meta: UnitMeta;
  /** Blocs du body de la unit — pour rendu dans /programs/[slug]/[unitSlug]. */
  bodyBlocks: unknown[];
  steps: ProgramTreeStep[];
};

export type ProgramTree = {
  meta: ProgramMeta;
  /** Blocs du body du programme (intro, etc.) pour rendu dans /programs/[slug]. */
  bodyBlocks: unknown[];
  /** Ressources épinglées (callouts 📌) — affichées en sidebar. */
  pinnedResources: PinnedResource[];
  units: ProgramTreeUnit[];
  /** Timestamp de sync (rempli par getProgramTree). ISO string. */
  syncedAt?: string;
};
export type PostMeta = { 
  slug: string; 
  title: string; 
  excerpt?: string|null; 
  notionId: string; 
  cover?: string|null;
  lastEdited?: string;
}

// Learning path types (legacy hub/sprint model — kept for catch-all page rendering)
export type ActivityStep = {
  id: string;
  order: number;
  title: string;
  type?: string | null;
  duration?: string | number | null;
  url?: string | null;
  instructions?: string | null;
};

export type DayEntry = {
  id: string;
  order: number;
  slug: string;
  title: string;
  summary?: string | null;
  state?: string | null; // ouvert/verrouille etc.
  unlockDate?: string | null;
  unlockOffsetDays?: number | null;
  steps: ActivityStep[];
  settings?: DayMetaConfig | null;
  /** Marqué comme complété par l'user connecté (remonté par buildDayEntriesFromProgram). */
  completed?: boolean;
};

export type LearningPath = {
  days: DayEntry[];
  kind?: 'days' | 'modules';
  unitLabelSingular?: string;
  unitLabelPlural?: string;
};

export type CohortMeta = {
  slug: string;
  hubNotionId: string;
  hubNotionIds?: string[];
  startDate: string;
  endDate?: string | null;
  timezone: string;
  visibility: 'public' | 'private';
  password?: string | null;
  scheduleMode: 'relative' | 'absolute';
  unitLabelSingular?: string | null;
  unitLabelPlural?: string | null;
  settings?: CohortMetaConfig | null;

  // ── LMS Tier 1 fields ──
  capacity?: number | null;
  enrollmentDeadline?: string | null;
  enrollmentUrl?: string | null;
  leadInstructorId?: string | null;
  leadInstructor?: InstructorMeta | null;
};

declare module './types' {}
