'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { IconBook, IconFileText, IconChevronRight, IconMenu, IconX } from '@/components/ui/icons';
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
    <SidebarIconVisual icon={parentIcon ?? null} fallback={<IconBook size={18} />} size={20} />
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
    <div className="space-y-3 rounded-[28px] bg-[color-mix(in_oklab,var(--bg)_92%,white_8%)] p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-4">
        <span
          className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-inner ${
            isParentActive ? 'ring-2 ring-[color:var(--primary)]' : 'ring-1 ring-[color:var(--border)]'
          }`}
        >
          <SidebarIconVisual icon={parentIcon ?? null} fallback={<IconBook size={22} />} size={24} />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={`/${parentSlug}`}
            className={`block text-lg font-bold tracking-tight transition-colors ${
              isParentActive ? 'text-[color:var(--primary)]' : 'text-[color:var(--fg)] hover:text-[color:var(--primary)]'
            }`}
            onClick={onNavigate}
          >
            {parentTitle}
          </Link>
          
        </div>
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
  if (!navigation.length) {
    return (
      <p className="text-sm text-muted-soft italic">
        Aucune sous-page disponible
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-bold uppercase tracking-[0.3em] text-[color:var(--fg-muted)]">Accès rapide</div>
      <div className="rounded-3xl border border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_90%,white_10%)] p-4 shadow-[var(--shadow-soft)]">
        <ul className="space-y-5">
          {navigation.map((item, idx) => {
            if (item.type === 'section' && item.children) {
              return (
                <li key={`section-${idx}`}>
                  <div className="mb-2 flex items-center justify-between border-b border-dashed border-[color:var(--border)] pb-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
                    <span>{stripPinEmoji(item.title)}</span>
                    <span className="text-[color:var(--muted)]">●</span>
                  </div>
                  <ul className="space-y-2">
                    {item.children.map((child) => {
                      const isActive = currentPath === child.slug;
                      return (
                        <li key={child.id}>
                          <Link
                            href={`/${child.slug}`}
                            className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                              isActive
                                ? 'border border-primary/40 bg-[color-mix(in_oklab,var(--primary)_12%,white_88%)] text-foreground shadow-[0_12px_30px_rgba(15,23,40,0.12)]'
                                : 'border border-transparent text-muted hover:-translate-y-[1px] hover:border-[color:var(--border)] hover:bg-[color:var(--bg-soft)] hover:text-foreground'
                            }`}
                            onClick={onNavigate}
                          >
                            <span
                              className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_10%,#fff)] text-[color:var(--primary)] shadow-inner/20"
                              aria-hidden
                            >
                              <SidebarIconVisual icon={child.icon ?? null} fallback={<IconFileText size={16} />} size={16} />
                            </span>
                            <span className="flex-1">{stripPinEmoji(child.title)}</span>
                            {isActive && (
                              <span className="text-primary" aria-hidden>
                                <IconChevronRight size={14} />
                              </span>
                            )}
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
                <li key={item.id || `page-${idx}`}>
                  <Link
                    href={`/${item.slug}`}
                    className={`group relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all border ${
                      isActive
                        ? 'border border-primary/40 bg-[color-mix(in_oklab,var(--primary)_12%,white_88%)] text-foreground shadow-[0_12px_30px_rgba(15,23,40,0.12)]'
                        : 'border border-transparent text-muted hover:-translate-y-[1px] hover:border-[color:var(--border)] hover:bg-[color:var(--bg-soft)] hover:text-foreground'
                    }`}
                    onClick={onNavigate}
                  >
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--primary)_10%,#fff)] text-[color:var(--primary)] shadow-inner/20"
                      aria-hidden
                    >
                      <SidebarIconVisual icon={item.icon ?? null} fallback={<IconFileText size={16} />} size={16} />
                    </span>
                    <span className="flex-1">{stripPinEmoji(item.title)}</span>
                    {isActive && (
                      <span className="text-primary" aria-hidden>
                        <IconChevronRight size={14} />
                      </span>
                    )}
                  </Link>
                </li>
              );
            }

            return null;
          })}
        </ul>
      </div>
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
  const moduleHeading = isHub ? "Modules par jour" : "Modules disponibles";

  if (!hasWeeks && !hasModules) return null;

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
                    <div className="px-5 pb-4">
                      <ul className="relative space-y-2 pb-1 before:absolute before:left-3 before:top-1 before:bottom-1 before:w-px before:bg-[color:var(--border)]">
                        {days.map((d) => {
                          const isActive = currentPath === d.slug;
                          const displayTitle = d.title?.trim() || `Jour ${d.order}`;
                          return (
                            <li key={d.id} className="relative pl-6">
                              <span
                                className={`absolute left-0 top-3 h-3 w-3 -translate-x-1/2 rounded-full border-2 ${
                                  isActive
                                    ? 'border-[color:var(--primary)] bg-[color:var(--primary)]'
                                    : 'border-[color:var(--border)] bg-white'
                                }`}
                              />
                              <Link
                                href={`/${d.slug}`}
                                className={`flex items-start gap-3 rounded-2xl px-3 py-2 text-sm transition ${
                                  isActive
                                    ? 'bg-[color-mix(in_oklab,var(--primary)_10%,#fff)] text-foreground shadow-[0_12px_24px_rgba(15,23,40,0.12)]'
                                    : 'text-muted hover:bg-[color:var(--bg-soft)] hover:text-foreground'
                                }`}
                                onClick={onNavigate}
                              >
                                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_oklab,var(--primary)_12%,white_88%)] text-[color:var(--primary)] text-xs font-semibold">
                                  {d.order}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate font-semibold">{displayTitle}</p>
                                  {d.summary ? (
                                    <p className="text-xs text-[color:var(--muted)]">{d.summary}</p>
                                  ) : null}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {hasModules ? (
        <div className="mt-8 space-y-4 border-t border-border/30 pt-6">
          <div className="text-xs font-bold uppercase tracking-[0.3em] text-foreground/70">{moduleHeading}</div>
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
