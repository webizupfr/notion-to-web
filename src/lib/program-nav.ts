import 'server-only';

import type { DayEntry, ActivityStep, ProgramTree } from '@/lib/types';

// ─── Helpers timezone Europe/Paris ───
//
// On compare les unlocks en JOURS CIVILS Paris (pas en timestamps glissants 24h).
// Sinon : si l'user s'inscrit à 18h, son Jour 2 ne se débloque qu'à 18h le lendemain,
// alors qu'il s'attend naturellement à un déblocage "le jour J" (= dès minuit Paris).

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
 * - `sync`  : unit.unlockAt if defined, else startDatetime + dayIndex - 1
 * - `event` : always unlocked
 */
function computeUnitUnlockDate(opts: {
  programType: ProgramTree['meta']['type'];
  enrolledAt: Date | null;
  programStartDatetime: string | null;
  unit: ProgramTree['units'][number]['meta'];
}): string | null {
  const { programType, enrolledAt, programStartDatetime, unit } = opts;

  if (programType === 'event') return null;

  // 1) explicit unlockAt wins
  if (unit.unlockAt) return unit.unlockAt;

  // 2) sync : program start + dayIndex offset
  if (programType === 'sync') {
    if (programStartDatetime) {
      const base = new Date(programStartDatetime);
      if (!isNaN(base.getTime())) {
        const off = (unit.dayIndex ?? unit.order) - 1;
        const d = new Date(base);
        d.setDate(d.getDate() + Math.max(0, off));
        return d.toISOString();
      }
    }
    return null;
  }

  // 3) async : enrolledAt + unlockOffsetDays
  if (programType === 'async') {
    if (enrolledAt) {
      const off = unit.unlockOffsetDays ?? (unit.dayIndex ?? unit.order) - 1;
      const d = new Date(enrolledAt);
      d.setDate(d.getDate() + Math.max(0, off));
      return d.toISOString();
    }
    return null;
  }

  return null;
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
    const unlockDate = computeUnitUnlockDate({
      programType: meta.type,
      enrolledAt,
      programStartDatetime: meta.startDatetime ?? null,
      unit: u,
    });

    const isLocked = (() => {
      if (meta.type === 'event') return false;
      if (!unlockDate) return false; // pas de contrainte → accessible
      // Compare en jour civil Europe/Paris : si on est le jour J, l'unit
      // est dispo dès 00:00 Paris (pas H+24 glissant).
      const todayKey = todayKeyParis();
      const unlockKey = dateKeyParisFromIso(unlockDate);
      if (!unlockKey) return false;
      return unlockKey > todayKey; // verrouillé seulement si STRICTEMENT après aujourd'hui
    })();

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
