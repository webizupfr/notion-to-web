'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
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
};

const numberEmojis = ['0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

const numberToEmoji = (value: number): string => {
  if (value >= 0 && value < numberEmojis.length) return numberEmojis[value];
  return `${value}.`;
};

const cleanModuleTitle = (title: string): string => title.replace(/^module\s*\d+\s*[-–—]?\s*/i, '').trim() || title;
const normalizeLabel = (value: string | undefined | null): string => (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const isUrl = (value: string | null | undefined): value is string => Boolean(value && /^https?:\/\//i.test(value));

const renderSidebarIcon = (icon: string | null | undefined, fallback: JSX.Element, size = 20, className = '') => {
  if (!icon) return fallback;
  if (isUrl(icon)) {
    return (
      <span
        className={`inline-block overflow-hidden rounded-md ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={icon}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center justify-center ${className}`} style={{ fontSize: Math.max(14, size - 2) }} aria-hidden>
      {icon}
    </span>
  );
};

export function PageSidebar({ parentTitle, parentSlug, parentIcon, navigation, isHub = false, hubDescription, releasedDays = [], learningKind, unitLabelSingular, unitLabelPlural, moduleQuickGroups }: PageSidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const unitSingular = unitLabelSingular?.trim() || 'Jour';
  const unitPlural = unitLabelPlural?.trim() || (unitSingular === 'Jour' ? 'Jours' : `${unitSingular}s`);
  const isModuleMode = learningKind === 'modules';

  const currentPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  const isParentActive = currentPath === parentSlug;
  const parentIconNode = renderSidebarIcon(parentIcon ?? null, <IconBook size={18} />, 20);
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

  // Enlever le "/" initial pour comparer

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
        {/* Titre principal avec lien vers la page parent */}
        <div className="space-y-3 border-b border-border/40 pb-5">
          {/* No icon in sidebar as requested */}
          <Link 
            href={`/${parentSlug}`}
            className={`group flex items-center gap-2 text-xl font-bold transition-all ${
              isParentActive
                ? 'text-[color:var(--primary)]'
                : 'text-[color:var(--fg)] hover:text-[color:var(--primary)]'
            }`}
            onClick={() => setIsOpen(false)}
          >
            <span className={`transition-transform ${
              isParentActive ? 'scale-105' : 'group-hover:scale-105'
            }`} aria-hidden="true">
              {renderSidebarIcon(parentIcon ?? null, <IconBook size={20} />, 22)}
            </span>
            {parentTitle}
          </Link>
          {isHub && hubDescription && (
            <p className="text-sm leading-6 text-[color:var(--muted)]">
              {hubDescription}
            </p>
          )}
        </div>

        {/* Navigation hiérarchique (accès rapide) */}
        {filteredNavigation.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--fg)]/70">Accès rapide</div>
            <ul className="space-y-4">
              {filteredNavigation.map((item, idx) => {
              if (item.type === 'section' && item.children) {
                return (
                  <li key={`section-${idx}`}>
                    {/* Titre de la section avec style premium */}
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
                      <span>{item.title}</span>
                      <div className="h-px flex-1 bg-gradient-to-l from-border/60 to-transparent" />
                    </div>
                    
                    {/* Pages sous cette section avec indicateur */}
                    <ul className="space-y-1.5">
                      {item.children.map((child) => {
                        const isActive = currentPath === child.slug;
                        
                        return (
                          <li key={child.id}>
                            <Link
                              href={`/${child.slug}`}
                              className={`group relative flex items-center gap-3 rounded-[12px] px-4 py-2.5 text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-primary/10 text-foreground shadow-sm border border-primary/30'
                                  : 'text-muted hover:bg-background-soft hover:text-foreground hover:translate-x-0.5 border border-transparent'
                              }`}
                              onClick={() => setIsOpen(false)} // Fermer sur mobile après clic
                            >
                              {/* Indicateur gauche pour page active */}
                              <span className={`absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full transition-all ${
                                isActive 
                                  ? 'bg-primary' 
                                  : 'bg-transparent group-hover:bg-primary/30'
                              }`}></span>
                              
                              {/* Icône */}
                              <span className={`transition-transform ${
                                isActive ? 'scale-105' : 'group-hover:scale-105'
                              }`} aria-hidden>
                                {renderSidebarIcon(child.icon ?? null, <IconFileText size={16} />, 18)}
                              </span>
                              
                              {/* Titre */}
                              <span className="flex-1">{child.title}</span>
                              
                              {/* Flèche pour page active */}
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
              
              // Page standalone (sans section)
              if (item.type === 'page' && item.slug) {
                const isActive = currentPath === item.slug;
                
                return (
                  <li key={item.id || `page-${idx}`}>
                    <Link
                      href={`/${item.slug}`}
                      className={`group relative flex items-center gap-3 rounded-[12px] px-4 py-2.5 text-sm font-medium transition-all border ${
                        isActive
                          ? 'bg-primary/10 text-foreground shadow-sm border-primary/30'
                          : 'text-muted hover:bg-background-soft hover:text-foreground hover:translate-x-0.5 border-transparent'
                      }`}
                      onClick={() => setIsOpen(false)} // Fermer sur mobile après clic
                    >
                      <span className={`absolute left-0 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-r-full transition-all ${
                        isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/30'
                      }`}></span>
                      <span className={`transition-transform ${
                        isActive ? 'scale-105' : 'group-hover:scale-105'
                      }`} aria-hidden>
                        {renderSidebarIcon(item.icon ?? null, <IconFileText size={16} />, 18)}
                      </span>
                      <span className="flex-1">{item.title}</span>
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
        )}

        {/* Quick access list (days by week) */}
        {isHub && !isModuleMode && weekList.length > 0 && (
          <div className="mt-8 space-y-3 border-t border-border/30 pt-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {unitPlural} disponibles
            </div>
            <div className="space-y-2">
              {weekList.map((w) => {
                const open = openWeeks[w] ?? false;
                const days = weeks.get(w) ?? [];
                return (
                  <div key={`week-${w}`} className="rounded-xl border border-border/40 bg-white/80 backdrop-blur-sm">
                    <button
                      onClick={() => setOpenWeeks((s) => ({ ...s, [w]: !open }))}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-foreground"
                    >
                      <span>Semaine {w}</span>
                      <span className="text-base" aria-hidden>{open ? '–' : '+'}</span>
                    </button>
                    {open && (
                      <ul className="space-y-1.5 px-3 pb-3">
                        {days.map((d) => {
                          const isActive = currentPath === d.slug;
                          const displayTitle = d.title?.trim() || `Jour ${d.order}`;
                          return (
                            <li key={d.id}>
                              <Link
                                href={`/${d.slug}`}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition border ${
                                  isActive
                                    ? 'bg-primary/12 text-foreground border-primary/45 shadow-[0_10px_24px_-14px_rgba(15,23,40,0.45)] translate-y-[-1px]'
                                    : 'text-muted hover:bg-background-soft hover:text-foreground hover:-translate-y-[1px] border-transparent'
                                }`}
                                onClick={() => setIsOpen(false)}
                              >
                                <span className="text-lg" aria-hidden>{numberToEmoji(d.order)}</span>
                                <span className="flex-1 min-w-0 truncate">{displayTitle}</span>
                                {d.summary ? (
                                  <span className="ml-2 hidden text-xs text-muted-soft sm:inline">{d.summary}</span>
                                ) : null}
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
        )}

        {isHub && isModuleMode && moduleQuickGroups && moduleQuickGroups.length > 0 && (
          <div className="mt-8 space-y-3 border-t border-border/30 pt-6">
            <div className="text-xs font-bold uppercase tracking-wider text-foreground/70">Modules par jour</div>
            <div className="space-y-2">
              {moduleQuickGroups.map((group) => {
                const open = openModuleGroups[group.label] ?? false;
                return (
                  <div key={group.label} className="rounded-xl border border-border/40 bg-white/80 backdrop-blur-sm">
                    <button
                      type="button"
                      onClick={() => setOpenModuleGroups((prev) => ({ ...prev, [group.label]: !open }))}
                      className="flex w-full items-center justify-between px-4 py-2 text-left text-sm font-semibold text-foreground"
                      aria-expanded={open}
                    >
                      <span>{group.label}</span>
                      <span className="text-base" aria-hidden>{open ? '–' : '+'}</span>
                    </button>
                    {open && (
                      <ul className="space-y-1 px-3 pb-3">
                        {group.items.map((item, idx) => {
                          const isActive = currentPath === item.slug;
                          const number = item.order ?? idx + 1;
                          const title = cleanModuleTitle(item.title);
                          return (
                            <li key={item.id}>
                              <Link
                                href={`/${item.slug}`}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                  isActive ? 'bg-primary/10 text-foreground border border-primary/30' : 'text-muted hover:bg-background-soft hover:text-foreground border border-transparent'
                                }`}
                                onClick={() => setIsOpen(false)}
                              >
                                <span className="text-lg" aria-hidden>{numberToEmoji(number)}</span>
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
        )}
        
        

        {/* Message si pas de navigation */}
        {navigation.length === 0 && (
          <p className="text-sm text-muted-soft italic">
            Aucune sous-page disponible
          </p>
        )}
      </nav>
      </aside>
    </>
  );
}
