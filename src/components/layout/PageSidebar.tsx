'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { IconBook, IconFileText, IconMenu, IconX } from '@/components/ui/icons';
import type { DayEntry } from '@/lib/types';

type NavItem = {
  type: 'section' | 'page';
  title: string;
  id?: string;
  slug?: string;
  icon?: string | null;
  children?: Array<{ id: string; title: string; slug: string; icon?: string | null }>;
};

type PageSidebarProps = {
  parentTitle: string;
  parentSlug: string;
  parentIcon?: string | null;
  navigation: NavItem[];
  isHub?: boolean;
  hubDescription?: string | null;
  releasedDays?: DayEntry[];
  learningKind?: 'days' | 'modules';
  unitLabelSingular?: string | null;
  unitLabelPlural?: string | null;
  moduleQuickGroups?: Array<{ label: string; items: Array<{ id: string; title: string; slug: string; order: number }> }>;
  actionsSlot?: ReactNode;
  /** Si la page n'a pas de Header global : sidebar part de tout en haut. */
  fullHeight?: boolean;
};

const cleanModuleTitle = (title: string): string => title.replace(/^module\s*\d+\s*[-–—]?\s*/i, '').trim() || title;
const normalizeLabel = (value: string | undefined | null): string => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const stripPinEmoji = (value: string): string => {
  const cleaned = value.replace(/^\s*📌\s*/u, '').trim();
  return cleaned || value.trim();
};
const isUrl = (value: string | null | undefined): value is string => Boolean(value && /^https?:\/\//i.test(value));

/** Format court "15/04" pour l'affichage dans la sidebar (space contraint). */
function formatUnlockShort(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });
}

export function PageSidebar({
  parentTitle,
  parentSlug,
  parentIcon,
  navigation,
  isHub = false,
  releasedDays = [],
  learningKind,
  unitLabelSingular,
  unitLabelPlural,
  moduleQuickGroups,
  actionsSlot,
  fullHeight = false,
}: PageSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const unitSingular = unitLabelSingular?.trim() || 'Jour';
  const unitPlural = unitLabelPlural?.trim() || (unitSingular === 'Jour' ? 'Jours' : `${unitSingular}s`);
  const isModuleMode = learningKind === 'modules';

  const currentPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  const isParentActive = currentPath === parentSlug;
  const filteredNavigation = useMemo(() => {
    if (!navigation.length) return [] as NavItem[];
    if (!isModuleMode) return navigation;
    return navigation.filter((item) => {
      if (item.type !== 'section') return true;
      return normalizeLabel(item.title) !== 'modules';
    });
  }, [navigation, isModuleMode]);

  const { weeks, weekList } = useMemo(() => {
    if (!releasedDays?.length || isModuleMode) {
      return { weeks: new Map<number, DayEntry[]>(), weekList: [] as number[] };
    }
    const groups = new Map<number, DayEntry[]>();
    for (const d of releasedDays) {
      const order = Number((d as { order?: number }).order ?? 1);
      const week = Math.max(1, Math.ceil(order / 7));
      const arr = groups.get(week) ?? [];
      arr.push(d);
      groups.set(week, arr);
    }
    const list = Array.from(groups.keys()).sort((a, b) => a - b);
    return { weeks: groups, weekList: list };
  }, [releasedDays, isModuleMode]);

  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({});
  const [openModuleGroups, setOpenModuleGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setOpenWeeks((prev) => {
      const next: Record<number, boolean> = {};
      if (!weekList.length) return next;
      // Ouvre TOUTES les semaines par défaut → l'apprenant voit immédiatement
      // sa progression complète sans avoir à dérouler.
      for (const w of weekList) next[w] = prev[w] ?? true;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekList.join(',')]);

  useEffect(() => {
    if (!isModuleMode || !moduleQuickGroups?.length) return;
    setOpenModuleGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of moduleQuickGroups) {
        // Ouvert par défaut → l'apprenant voit la liste complète des modules.
        next[group.label] = prev[group.label] ?? true;
      }
      return next;
    });
  }, [moduleQuickGroups, currentPath, isModuleMode]);

  const handleNavigate = () => setIsOpen(false);
  const toggleWeek = (week: number) => setOpenWeeks((prev) => ({ ...prev, [week]: !(prev[week] ?? false) }));
  const toggleModuleGroup = (label: string) => setOpenModuleGroups((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));

  return (
    <>
      {/* Mobile bar — fixed top, échappe au flex parent */}
      <div className="lg:hidden fixed inset-x-0 top-0 z-[var(--z-sticky)] border-b border-[color:var(--border-subtle)] bg-[color-mix(in_oklab,var(--surface-0)_94%,transparent)] backdrop-blur-sm">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center gap-2 px-4 py-3 text-left text-[0.9rem] text-[color:var(--text-primary)]"
          aria-label={isOpen ? 'Fermer la navigation' : 'Ouvrir la navigation'}
          aria-expanded={isOpen}
        >
          <span aria-hidden>{isOpen ? <IconX /> : <IconMenu />}</span>
          <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
            Menu
          </span>
          <span className="truncate font-semibold">{parentTitle}</span>
        </button>
      </div>
      {/* Spacer pour compenser le bar fixed sur mobile uniquement */}
      <div className="lg:hidden h-[52px]" aria-hidden />

      {isOpen && (
        <div
          className="fixed inset-0 bg-[rgba(15,23,42,0.4)] z-[var(--z-drawer)] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`
          fixed lg:sticky
          lg:flex-shrink-0
          top-0 left-0 lg:left-auto
          ${fullHeight ? 'lg:top-0 lg:h-screen' : 'lg:top-14 lg:h-[calc(100vh-3.5rem)]'}
          h-screen
          w-[min(340px,86vw)] lg:w-64 xl:w-72
          border-r border-[color:var(--border-subtle)]
          bg-[color:var(--surface-1)]
          z-[var(--z-drawer)]
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label={isHub ? 'Navigation du hub' : 'Navigation du sprint'}
      >
        <nav className="flex h-full flex-col overflow-y-auto px-[var(--space-lg)] py-[var(--space-xl)] gap-[var(--space-lg)]">
          <SidebarHeader
            parentTitle={parentTitle}
            parentSlug={parentSlug}
            parentIcon={parentIcon ?? null}
            isParentActive={isParentActive}
            onNavigate={handleNavigate}
          />

          {/* Ressources EN HAUT — toujours visibles (pages clés du programme) */}
          {actionsSlot ? (
            <div className="space-y-[var(--space-xs)]">
              <div className="nav-rail__label">Ressources</div>
              {actionsSlot}
            </div>
          ) : null}

          <SidebarQuickNav
            navigation={filteredNavigation}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />

          <SidebarProgress
            isHub={isHub}
            isModuleMode={isModuleMode}
            unitPlural={unitPlural}
            weekList={weekList}
            weeks={weeks}
            openWeeks={openWeeks}
            onToggleWeek={toggleWeek}
            moduleQuickGroups={moduleQuickGroups}
            openModuleGroups={openModuleGroups}
            onToggleModuleGroup={toggleModuleGroup}
            currentPath={currentPath}
            onNavigate={handleNavigate}
          />
        </nav>
      </aside>
    </>
  );
}

type SidebarIconVisualProps = {
  icon?: string | null;
  fallback: JSX.Element;
  size?: number;
};

function SidebarIconVisual({ icon, fallback, size = 16 }: SidebarIconVisualProps) {
  const [errored, setErrored] = useState(false);
  const baseStyle = { width: size, height: size };
  const emojiStyle = { ...baseStyle, fontSize: Math.max(12, size - 2) };

  if (!icon || errored) {
    return (
      <span className="inline-flex items-center justify-center" style={emojiStyle} aria-hidden>
        {icon && !isUrl(icon) ? icon : fallback}
      </span>
    );
  }
  if (isUrl(icon)) {
    return (
      <span className="inline-block overflow-hidden rounded-[3px]" style={baseStyle} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={icon} alt="" className="h-full w-full object-cover" onError={() => setErrored(true)} />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center" style={emojiStyle} aria-hidden>
      {icon}
    </span>
  );
}

type SidebarHeaderProps = {
  parentTitle: string;
  parentSlug: string;
  parentIcon: string | null;
  isParentActive: boolean;
  onNavigate: () => void;
};

function SidebarHeader({ parentTitle, parentSlug, parentIcon, isParentActive, onNavigate }: SidebarHeaderProps) {
  return (
    <div className="space-y-2 pb-[var(--space-md)] border-b border-[color:var(--border-subtle)]">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-s)] border ${
            isParentActive
              ? 'border-[color:var(--accent-edge)] bg-[color:var(--accent-bg)]'
              : 'border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]'
          }`}
        >
          <SidebarIconVisual icon={parentIcon} fallback={<IconBook size={16} />} size={16} />
        </span>
        <Link
          href={`/${parentSlug}`}
          onClick={onNavigate}
          className={`min-w-0 truncate text-[0.98rem] font-semibold tracking-[-0.01em] transition-colors ${
            isParentActive ? 'text-[color:var(--text-primary)]' : 'text-[color:var(--text-primary)] hover:text-[color:var(--accent-edge)]'
          }`}
        >
          {parentTitle}
        </Link>
      </div>
    </div>
  );
}

type SidebarQuickNavProps = {
  navigation: NavItem[];
  currentPath: string;
  onNavigate: () => void;
};

function SidebarQuickNav({ navigation, currentPath, onNavigate }: SidebarQuickNavProps) {
  // Pas de navigation → on ne rend rien (au lieu du placeholder "Pas de sous-page"
  // qui n'apportait rien). Les ressources sont gérées séparément en haut.
  if (!navigation.length) return null;

  const hasTopLevelSection = navigation.some((item) => item.type === 'section' && item.children?.length);

  return (
    <div>
      {!hasTopLevelSection ? <div className="nav-rail__label">Accès rapide</div> : null}
      <ul className="nav-rail">
        {navigation.map((item, idx) => {
          if (item.type === 'section' && item.children) {
            return (
              <li key={`section-${idx}`} className="nav-rail__section">
                <div className="nav-rail__label" style={{ marginBottom: 6 }}>
                  {stripPinEmoji(item.title)}
                </div>
                <ul className="m-0 list-none p-0 space-y-[2px]">
                  {item.children.map((child) => {
                    const isActive = currentPath === child.slug;
                    return (
                      <li key={child.id}>
                        <Link
                          href={`/${child.slug}`}
                          onClick={onNavigate}
                          className="nav-rail__item"
                          data-active={isActive || undefined}
                          aria-current={isActive ? 'page' : undefined}
                        >
                          <SidebarIconVisual icon={child.icon ?? null} fallback={<IconFileText size={14} />} size={14} />
                          <span className="min-w-0 flex-1 truncate">{stripPinEmoji(child.title)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          }

          if (item.type === 'page' && item.slug) {
            const isActive = currentPath === item.slug;
            return (
              <li key={item.id || `page-${idx}`} className="nav-rail__section" style={{ padding: '2px 0', border: 'none' }}>
                <Link
                  href={`/${item.slug}`}
                  onClick={onNavigate}
                  className="nav-rail__item"
                  data-active={isActive || undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <SidebarIconVisual icon={item.icon ?? null} fallback={<IconFileText size={14} />} size={14} />
                  <span className="min-w-0 flex-1 truncate">{stripPinEmoji(item.title)}</span>
                </Link>
              </li>
            );
          }

          return null;
        })}
      </ul>
    </div>
  );
}

type SidebarProgressProps = {
  isHub: boolean;
  isModuleMode: boolean;
  unitPlural: string;
  weekList: number[];
  weeks: Map<number, DayEntry[]>;
  openWeeks: Record<number, boolean>;
  onToggleWeek: (week: number) => void;
  moduleQuickGroups?: PageSidebarProps['moduleQuickGroups'];
  openModuleGroups: Record<string, boolean>;
  onToggleModuleGroup: (label: string) => void;
  currentPath: string;
  onNavigate: () => void;
};

function SidebarProgress({
  isHub,
  isModuleMode,
  unitPlural,
  weekList,
  weeks,
  openWeeks,
  onToggleWeek,
  moduleQuickGroups,
  openModuleGroups,
  onToggleModuleGroup,
  currentPath,
  onNavigate,
}: SidebarProgressProps) {
  const hasModules = isModuleMode && Boolean(moduleQuickGroups?.length);
  if (!isHub && !hasModules) return null;

  const hasWeeks = isHub && !isModuleMode && weekList.length > 0;
  const moduleHeading = isHub ? 'Modules par jour' : 'Modules disponibles';

  if (!hasWeeks && !hasModules) return null;

  return (
    <div className="space-y-[var(--space-md)] pt-[var(--space-md)] border-t border-[color:var(--border-subtle)]">
      {hasWeeks ? (
        <div>
          <div className="nav-rail__label">{unitPlural} disponibles</div>
          <div className="mt-[var(--space-xs)] space-y-[2px]">
            {weekList.map((w) => {
              const open = openWeeks[w] ?? false;
              const days = weeks.get(w) ?? [];
              return (
                <div key={`week-${w}`}>
                  <button
                    type="button"
                    onClick={() => onToggleWeek(w)}
                    className="flex w-full items-center justify-between rounded-[var(--r-s)] px-2 py-2 text-left transition-colors hover:bg-[color:var(--surface-1)]"
                    aria-expanded={open}
                  >
                    <span className="inline-flex items-center gap-2 text-[0.92rem] font-semibold text-[color:var(--text-primary)]">
                      <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                        W{String(w).padStart(2, '0')}
                      </span>
                      Semaine {w}
                    </span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-[14px] leading-none text-[color:var(--text-tertiary)]"
                      aria-hidden
                    >
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-1 space-y-[1px] pl-2">
                      {days.map((d) => {
                        const isActive = currentPath === d.slug;
                        const displayTitle = d.title?.trim() || `Jour ${d.order}`;
                        const isDone = Boolean(d.completed);
                        const isLocked = !isDone && Boolean(d.state && /verrou/i.test(d.state));
                        const unlockShort = isLocked ? formatUnlockShort(d.unlockDate) : null;
                        return (
                          <li key={d.id}>
                            <Link
                              href={`/${d.slug}`}
                              onClick={onNavigate}
                              className="nav-rail__item"
                              data-active={isActive || undefined}
                              data-done={isDone || undefined}
                              data-locked={isLocked || undefined}
                              aria-current={isActive ? 'page' : undefined}
                              title={unlockShort ? `Débloqué le ${unlockShort}` : undefined}
                            >
                              <span className="nav-rail__item-index" aria-hidden>
                                {isDone ? '✓' : isLocked ? '🔒' : String(d.order).padStart(2, '0')}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate">{displayTitle}</span>
                                {unlockShort ? (
                                  <span className="mt-[1px] block font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--text-tertiary)]">
                                    Dispo le {unlockShort}
                                  </span>
                                ) : null}
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasModules ? (
        <div>
          <div className="nav-rail__label">{moduleHeading}</div>
          <div className="mt-[var(--space-xs)] space-y-[2px]">
            {moduleQuickGroups!.map((group) => {
              const open = openModuleGroups[group.label] ?? false;
              return (
                <div key={group.label}>
                  <button
                    type="button"
                    onClick={() => onToggleModuleGroup(group.label)}
                    className="flex w-full items-center justify-between rounded-[var(--r-s)] px-2 py-2 text-left transition-colors hover:bg-[color:var(--surface-1)]"
                    aria-expanded={open}
                  >
                    <span className="text-[0.92rem] font-semibold text-[color:var(--text-primary)]">
                      {group.label}
                    </span>
                    <span
                      className="font-[family-name:var(--font-mono)] text-[14px] leading-none text-[color:var(--text-tertiary)]"
                      aria-hidden
                    >
                      {open ? '−' : '+'}
                    </span>
                  </button>
                  {open && (
                    <ul className="mt-1 space-y-[1px] pl-2">
                      {group.items.map((item, idx) => {
                        const isActive = currentPath === item.slug;
                        const number = item.order ?? idx + 1;
                        const title = cleanModuleTitle(item.title);
                        return (
                          <li key={item.id}>
                            <Link
                              href={`/${item.slug}`}
                              onClick={onNavigate}
                              className="nav-rail__item"
                              data-active={isActive || undefined}
                              aria-current={isActive ? 'page' : undefined}
                            >
                              <span className="nav-rail__item-index">
                                {String(number).padStart(2, '0')}
                              </span>
                              <span className="min-w-0 flex-1 truncate">{title}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

