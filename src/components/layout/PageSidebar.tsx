'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { IconChevronRight, IconMenu, IconX, IconHome, IconBookmark, IconStar, IconTarget, IconSparkles, IconCompass } from '@/components/ui/icons';
import type { DayEntry } from '@/lib/types';

// Navigation item : section ou page
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
};

const numberEmojis = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

const numberToEmoji = (value: number): string => {
  if (value >= 0 && value < numberEmojis.length) return numberEmojis[value];
  return `${value}.`;
};

const cleanModuleTitle = (title: string): string => title.replace(/^module\s*\d+\s*[-–—]?\s*/i, '').trim() || title;
const normalizeLabel = (value: string | undefined | null): string => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const stripPinEmoji = (value: string): string => {
  const cleaned = value.replace(/^\s*📌\s*/u, '').trim();
  return cleaned || value.trim();
};

const quickNavIconSet = [IconBookmark, IconStar, IconTarget, IconSparkles, IconCompass] as const;

const isUrl = (value: string | null | undefined): value is string => Boolean(value && /^https?:\/\//i.test(value));

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
}: PageSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const unitSingular = unitLabelSingular?.trim() || 'Jour';
  const unitPlural = unitLabelPlural?.trim() || (unitSingular === 'Jour' ? 'Jours' : `${unitSingular}s`);
  const isModuleMode = learningKind === 'modules';

  const currentPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  const isParentActive = currentPath === parentSlug;
  const parentIconNode = (
    <SidebarIconVisual icon={parentIcon ?? null} fallback={<IconHome size={18} />} size={20} />
  );
  const filteredNavigation = useMemo(() => {
    if (!navigation.length) return [] as NavItem[];
    if (!isModuleMode) return navigation;
    return navigation.filter((item) => {
      if (item.type !== 'section') return true;
      return normalizeLabel(item.title) !== 'modules';
    });
  }, [navigation, isModuleMode]);

  // Group released activities by week (1-... by order)
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
    // Open the latest week by default when week list changes
    setOpenWeeks((prev) => {
      const next: Record<number, boolean> = {};
      if (!weekList.length) return next;
      const last = weekList[weekList.length - 1];
      for (const w of weekList) next[w] = prev[w] ?? (w === last);
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekList.join(',')]);
  useEffect(() => {
    if (!isModuleMode || !moduleQuickGroups?.length) return;
    setOpenModuleGroups((prev) => {
      const next: Record<string, boolean> = {};
      for (const group of moduleQuickGroups) {
        const hasCurrent = group.items.some((item) => item.slug === currentPath);
        next[group.label] = prev[group.label] ?? hasCurrent;
      }
      return next;
    });
  }, [moduleQuickGroups, currentPath, isModuleMode]);

  const handleNavigate = () => setIsOpen(false);
  const toggleWeek = (week: number) => {
    setOpenWeeks((prev) => ({ ...prev, [week]: !(prev[week] ?? false) }));
  };
  const toggleModuleGroup = (label: string) => {
    setOpenModuleGroups((prev) => ({ ...prev, [label]: !(prev[label] ?? false) }));
  };

  return (
    <>
      {/* Bouton toggle mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center gap-2 bg-[color:var(--primary)] text-[color:var(--bg)] px-[var(--space-4)] py-[var(--space-2)] rounded-[var(--r-md)] shadow-[var(--shadow-soft)] hover:bg-[color-mix(in_oklab,var(--primary)_90%,#000)] transition-colors"
      >
        <span className="text-lg" aria-hidden="true">{parentIconNode}</span>
        <span className="font-medium">{parentTitle}</span>
        <span className="text-lg" aria-hidden="true">{isOpen ? <IconX /> : <IconMenu />}</span>
      </button>

      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[color:rgba(0,0,0,0.5)] z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 lg:top-14 left-0 lg:left-auto h-screen lg:h-[calc(100vh-3.5rem)] w-full lg:w-64 xl:w-72
        border-r border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,#fff)] backdrop-blur-md shadow-[var(--shadow-soft)] z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <nav className="flex h-full flex-col overflow-y-auto px-[var(--space-5)] py-[var(--space-6)] space-y-[var(--space-8)]">
        <SidebarHeader
          parentTitle={parentTitle}
          parentSlug={parentSlug}
          parentIcon={parentIcon ?? null}
          isParentActive={isParentActive}
          onNavigate={handleNavigate}
        />

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
          parentPath={parentSlug}
        />

        <SidebarActions actionsSlot={actionsSlot} variant={isHub ? 'hub' : 'sprint'} />
      </nav>
      </aside>
    </>
  );
}

type SidebarIconVisualProps = {
  icon?: string | null;
  fallback: JSX.Element;
  size?: number;
  className?: string;
};

function SidebarIconVisual({ icon, fallback, size = 20, className = '' }: SidebarIconVisualProps) {
  const [errored, setErrored] = useState(false);
  const baseStyle = { width: size, height: size };
  const emojiStyle = { ...baseStyle, fontSize: Math.max(14, size - 2) };

  if (!icon || errored) {
    return (
      <span className={`inline-flex items-center justify-center ${className}`} style={emojiStyle} aria-hidden>
        {icon && !isUrl(icon) ? icon : fallback}
      </span>
    );
  }

  if (isUrl(icon)) {
    return (
      <span className={`inline-block overflow-hidden rounded-md ${className}`} style={baseStyle} aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center ${className}`} style={emojiStyle} aria-hidden>
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

function SidebarHeader({
  parentTitle,
  parentSlug,
  parentIcon,
  isParentActive,
  onNavigate,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-1">
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--bg)_80%,white_20%)] ${
          isParentActive ? 'text-[color:var(--primary)]' : 'text-[color:var(--fg)]'
        }`}
      >
        <SidebarIconVisual icon={parentIcon ?? null} fallback={<IconHome size={18} />} size={22} />
      </span>
      <Link
        href={`/${parentSlug}`}
        className={`block text-base font-semibold tracking-tight transition-colors ${
          isParentActive ? 'text-[color:var(--primary)]' : 'text-[color:var(--fg)] hover:text-[color:var(--primary)]'
        }`}
        onClick={onNavigate}
      >
        {parentTitle}
      </Link>
    </div>
  );
}

type SidebarQuickNavProps = {
  navigation: NavItem[];
  currentPath: string;
  onNavigate: () => void;
};

function SidebarQuickNav({ navigation, currentPath, onNavigate }: SidebarQuickNavProps) {
  if (!navigation.length) {
    return (
      <p className="text-sm text-muted-soft italic">
        Aucune sous-page disponible
      </p>
    );
  }

  let iconCursor = 0;
  const renderLink = (slug: string, title: string, icon?: string | null) => {
    const IconCandidate = quickNavIconSet[iconCursor % quickNavIconSet.length];
    iconCursor += 1;
    const isActive = currentPath === slug;
    return (
      <li key={slug}>
        <Link
          href={`/${slug}`}
          className={`group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
            isActive
              ? 'bg-[color-mix(in_oklab,var(--primary)_12%,white_88%)] text-foreground shadow-[0_10px_28px_rgba(15,23,40,0.12)]'
              : 'text-muted hover:bg-[color:var(--bg-soft)] hover:text-foreground'
          }`}
          onClick={onNavigate}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-inner/20 text-[color:var(--primary)]" aria-hidden>
            <SidebarIconVisual icon={icon ?? null} fallback={<IconCandidate size={16} />} size={16} />
          </span>
          <span className="flex-1 truncate">{stripPinEmoji(title)}</span>
          {isActive && (
            <span className="text-primary" aria-hidden>
              <IconChevronRight size={14} />
            </span>
          )}
        </Link>
      </li>
    );
  };

  const flattened: Array<{ slug: string; title: string; icon?: string | null }> = [];
  for (const item of navigation) {
    if (item.type === 'section' && item.children) {
      for (const child of item.children) {
        if (!child.slug) continue;
        flattened.push({ slug: child.slug, title: child.title, icon: child.icon });
      }
    } else if (item.type === 'page' && item.slug) {
      flattened.push({ slug: item.slug, title: item.title, icon: item.icon });
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--fg-muted)]">Accès rapide</div>
      <ul className="space-y-2">{flattened.map((entry) => renderLink(entry.slug, entry.title, entry.icon))}</ul>
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
  parentPath: string;
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
  parentPath,
}: SidebarProgressProps) {
  if (!isHub) return null;

  const hasWeeks = !isModuleMode && weekList.length > 0;
  const hasModules = isModuleMode && Boolean(moduleQuickGroups?.length);

  if (!hasWeeks && !hasModules) return null;

  const normalizedParent = parentPath.replace(/^\/+/, '').replace(/^hubs\//, '');
  const deriveProgressKey = (fullSlug?: string | null) => {
    if (!fullSlug) return null;
    const normalizedFull = fullSlug.replace(/^\/+/, '').replace(/^hubs\//, '');
    let daySegment = normalizedFull;
    if (normalizedFull.startsWith(`${normalizedParent}/`)) {
      daySegment = normalizedFull.slice(normalizedParent.length + 1);
    }
    const parentParts = normalizedParent.split('/').filter(Boolean);
    if (!parentParts.length) return null;
    const keyParts: string[] = ['hub', parentParts[0]];
    if (parentParts[1] === 'c' && parentParts[2]) {
      keyParts.push('c', parentParts[2]);
    }
    const daySlug = daySegment.split('/').filter(Boolean).pop();
    if (daySlug) keyParts.push(daySlug);
    return keyParts.join(':');
  };

  const isDayCompleted = (slug?: string | null) => {
    if (!slug) return false;
    const progressKey = deriveProgressKey(slug);
    if (!progressKey) return false;
    try {
      if (typeof window === 'undefined') return false;
      const raw = window.localStorage.getItem('sprint_progress');
      if (!raw) return false;
      const data = JSON.parse(raw) as Record<string, { done?: boolean }>;
      return Boolean(data[progressKey]?.done);
    } catch {
      return false;
    }
  };

  return (
    <>
      {hasWeeks ? (
        <div className="mt-8 space-y-4 border-t border-border/30 pt-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
            {unitPlural} disponibles
          </div>
          <div className="space-y-3">
            {weekList.map((w) => {
              const open = openWeeks[w] ?? false;
              const days = weeks.get(w) ?? [];
              return (
                <div key={`week-${w}`} className="rounded-3xl border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,white_10%)] shadow-[var(--shadow-subtle)]">
                  <button
                    type="button"
                    onClick={() => onToggleWeek(w)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-foreground"
                    aria-expanded={open}
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--primary)_14%,white_86%)] text-[color:var(--primary)] text-xs font-bold">
                        {w}
                      </span>
                      Semaine {w}
                    </span>
                    <span className="text-base" aria-hidden>{open ? '–' : '+'}</span>
                  </button>
                  {open && (
                    <ul className="space-y-2 px-5 pb-4">
                      {days.map((d) => {
                        const isActive = currentPath === d.slug;
                        const completed = isDayCompleted(d.slug);
                        const displayTitle = d.title?.trim() || `Jour ${d.order}`;
                        return (
                          <li key={d.id}>
                            <Link
                              href={`/${d.slug}`}
                              className={`flex items-center gap-3 rounded-2xl px-3 py-2 transition ${
                                isActive
                                  ? 'bg-[color-mix(in_oklab,var(--primary)_10%,#fff)] text-foreground shadow-[0_12px_24px_rgba(15,23,40,0.12)]'
                                  : 'text-muted hover:bg-[color:var(--bg-soft)] hover:text-foreground'
                              }`}
                              onClick={onNavigate}
                            >
                              <span
                                className={`h-2.5 w-2.5 rounded-full ${
                                  completed
                                    ? 'bg-emerald-500'
                                    : isActive
                                      ? 'bg-amber-400'
                                      : 'bg-[color:var(--border)]'
                                }`}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                                  Jour {d.order}
                                </p>
                                <p className="truncate font-semibold">{displayTitle}</p>
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
        <div className="mt-8 space-y-4 border-t border-border/30 pt-6">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-foreground/70">Modules par jour</div>
          <div className="space-y-3">
            {moduleQuickGroups!.map((group) => {
              const open = openModuleGroups[group.label] ?? false;
              return (
                <div key={group.label} className="rounded-3xl border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,white_10%)] shadow-[var(--shadow-subtle)]">
                  <button
                    type="button"
                    onClick={() => onToggleModuleGroup(group.label)}
                    className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-foreground"
                    aria-expanded={open}
                  >
                    <span>{group.label}</span>
                    <span className="text-base" aria-hidden>{open ? '–' : '+'}</span>
                  </button>
                  {open && (
                    <ul className="space-y-2 px-4 pb-4">
                      {group.items.map((item, idx) => {
                        const isActive = currentPath === item.slug;
                        const number = item.order ?? idx + 1;
                        const title = cleanModuleTitle(item.title);
                        return (
                          <li key={item.id}>
                            <Link
                              href={`/${item.slug}`}
                              className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm transition ${
                                isActive ? 'bg-primary/10 text-foreground border border-primary/30' : 'text-muted hover:bg-background-soft hover:text-foreground border border-transparent'
                              }`}
                              onClick={onNavigate}
                            >
                              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_12%,white_88%)] text-[color:var(--primary)] text-xs font-semibold" aria-hidden>
                                {numberToEmoji(number)}
                              </span>
                              <span className="flex-1 min-w-0 truncate">{title}</span>
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
    </>
  );
}

type SidebarActionsProps = {
  actionsSlot?: ReactNode;
  variant?: 'hub' | 'sprint';
};

function SidebarActions({ actionsSlot, variant = 'hub' }: SidebarActionsProps) {
  if (!actionsSlot) return null;
  return (
    <div
      className="space-y-3 border-t border-border/30 pt-6"
      data-section="sidebar-actions"
      data-variant={variant}
    >
      {actionsSlot}
    </div>
  );
}
