import 'server-only';

import type { DayEntry, ActivityStep, ProgramTree } from '@/lib/types';

// ─── Helpers timezone Europe/Paris ───
//
// On garde les offsets relatifs (`J+1`, `7 jours`) en JOURS CIVILS Paris.
// Sinon : si l'user s'inscrit à 18h, son Jour 2 ne se débloque qu'à 18h le lendemain,
// alors qu'il s'attend naturellement à un déblocage "le jour J" (= dès minuit Paris).
//
// Les dates explicites avec heure (`2026-06-12T09:00:00+02:00`) restent précises
// à la minute pour les programmes live/sync.

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

function todayKeyParis(): string {
  return dateKeyParis(new Date());
}

function dateKeyParisFromIso(iso: string): string | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return dateKeyParis(d);
}

function hasTimeComponent(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(iso.trim());
}

type ComputedUnlock = {
  date: string | null;
  precision: 'day' | 'instant';
};

type SidebarNavItem = {
  type: 'section' | 'page';
  title: string;
  id?: string;
  slug?: string;
  icon?: string | null;
  children?: Array<{ id: string; title: string; slug: string; icon?: string | null }>;
};

/**
 * Compute unlock ISO date for a unit, given the program type, user enrollment date
 * and the unit's unlock config.
 *
 * - `async` : enrolledAt + unlockOffsetDays (day-by-day)
 *   Fallback : dayIndex - 1
 * - explicit date+time : exact timestamp unlock
 * - explicit date-only : civil day unlock
 * - `sync`  : unit.unlockAt if defined, else startDatetime + dayIndex - 1
 * - `event` : unlocked unless unit.unlockAt is explicitly defined
 */
function computeUnitUnlockDate(opts: {
  programType: ProgramTree['meta']['type'];
  enrolledAt: Date | null;
  programStartDatetime: string | null;
  unit: ProgramTree['units'][number]['meta'];
}): ComputedUnlock {
  const { programType, enrolledAt, programStartDatetime, unit } = opts;

  // 1) explicit unlockAt wins
  if (unit.unlockAt) {
    return {
      date: unit.unlockAt,
      precision: hasTimeComponent(unit.unlockAt) ? 'instant' : 'day',
    };
  }

  if (programType === 'event') return { date: null, precision: 'day' };

  // 2) sync : program start + dayIndex offset
  if (programType === 'sync') {
    if (programStartDatetime) {
      const base = new Date(programStartDatetime);
      if (!isNaN(base.getTime())) {
        const off = (unit.dayIndex ?? unit.order) - 1;
        const d = new Date(base);
        d.setDate(d.getDate() + Math.max(0, off));
        return {
          date: d.toISOString(),
          precision: hasTimeComponent(programStartDatetime) ? 'instant' : 'day',
        };
      }
    }
    return { date: null, precision: 'day' };
  }

  // 3) async : enrolledAt + unlockOffsetDays
  if (programType === 'async') {
    if (enrolledAt) {
      const off = unit.unlockOffsetDays ?? (unit.dayIndex ?? unit.order) - 1;
      const d = new Date(enrolledAt);
      d.setDate(d.getDate() + Math.max(0, off));
      return { date: d.toISOString(), precision: 'day' };
    }
    return { date: null, precision: 'day' };
  }

  return { date: null, precision: 'day' };
}

function isUnlockLocked(unlock: ComputedUnlock): boolean {
  if (!unlock.date) return false;

  if (unlock.precision === 'instant') {
    const d = new Date(unlock.date);
    if (isNaN(d.getTime())) return false;
    return d.getTime() > Date.now();
  }

  const todayKey = todayKeyParis();
  const unlockKey = dateKeyParisFromIso(unlock.date);
  if (!unlockKey) return false;
  return unlockKey > todayKey;
}

/**
 * Convertit un ProgramTree + état d'inscription en DayEntry[] compatibles
 * avec StartToday / PageSidebar.releasedDays.
 *
 * Les "steps" Notion (activités internes à une unit) sont mappés en ActivityStep
 * pour rester compat avec l'API legacy du composant Sidebar.
 */
export function buildDayEntriesFromProgram(opts: {
  tree: ProgramTree;
  enrolledAt: Date | null;
  basePath: string; // ex: "programs/<slug>"
  /** Notion IDs des units complétées (DB progress). */
  completedUnitIds?: Set<string>;
}): DayEntry[] {
  const { tree, enrolledAt, basePath, completedUnitIds } = opts;
  const { meta, units } = tree;

  return units.map(({ meta: u, steps }) => {
    const unlock = computeUnitUnlockDate({
      programType: meta.type,
      enrolledAt,
      programStartDatetime: meta.startDatetime ?? null,
      unit: u,
    });
    const unlockDate = unlock.date;

    const isLocked = isUnlockLocked(unlock);

    const completed = completedUnitIds?.has(u.notionId) ?? false;

    const mappedSteps: ActivityStep[] = steps.map(({ meta: s }) => ({
      id: s.notionId,
      order: s.order ?? 0,
      title: s.title,
      type: s.type ?? null,
      duration: s.durationMinutes ?? null,
      url: null,
      instructions: null,
    }));

    return {
      id: u.notionId,
      order: u.order,
      slug: `${basePath}/${u.slug}`.replace(/\/+/g, '/'),
      title: u.title,
      summary: u.summary ?? null,
      state: isLocked ? 'verrouillé' : 'ouvert',
      unlockDate,
      unlockOffsetDays: u.unlockOffsetDays ?? null,
      steps: mappedSteps,
      completed,
    };
  });
}

/**
 * Construit un NavItem[] "flat" pour la sidebar — chaque unit devient une
 * entrée de type "page". Garde compat avec PageSidebar/NavItem shape.
 */
export function buildNavigationFromProgram(opts: {
  tree: ProgramTree;
  basePath: string; // ex: "programs/<slug>"
}): SidebarNavItem[] {
  const { tree, basePath } = opts;
  return tree.units.map(({ meta: u }) => ({
    type: 'page' as const,
    id: u.notionId,
    title: u.title,
    slug: `${basePath}/${u.slug}`.replace(/\/+/g, '/'),
    icon: null,
  }));
}

/**
 * Labels d'unit selon le type de programme.
 */
export function unitLabelsFor(type: ProgramTree['meta']['type']): {
  singular: string;
  plural: string;
  kind: 'days' | 'modules';
} {
  if (type === 'async') return { singular: 'Jour', plural: 'Jours', kind: 'days' };
  if (type === 'sync') return { singular: 'Module', plural: 'Modules', kind: 'modules' };
  return { singular: 'Session', plural: 'Sessions', kind: 'modules' };
}
