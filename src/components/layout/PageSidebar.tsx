'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type ChildPage = {
  id: string;
  title: string;
  slug: string;
};

type PageSidebarProps = {
  parentTitle: string;
  parentSlug: string;
  childPages: ChildPage[];
};

export function PageSidebar({ parentTitle, parentSlug, childPages }: PageSidebarProps) {
  const pathname = usePathname();
  
  // Enlever le "/" initial pour comparer
  const currentPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  
  return (
    <aside className="sticky top-20 h-fit w-full max-w-xs">
      <nav className="surface-card rounded-3xl p-6">
        {/* Titre de la section */}
        <div className="mb-6">
          <Link 
            href={`/${parentSlug}`}
            className={`block text-lg font-semibold transition-colors ${
              currentPath === parentSlug
                ? 'text-primary'
                : 'text-foreground hover:text-primary'
            }`}
          >
            {parentTitle}
          </Link>
        </div>

        {/* Liste des pages enfants */}
        {childPages.length > 0 && (
          <ul className="space-y-1">
            {childPages.map((child) => {
              const isActive = currentPath === child.slug;
              
              return (
                <li key={child.id}>
                  <Link
                    href={`/${child.slug}`}
                    className={`block rounded-xl px-4 py-2.5 text-sm transition-all ${
                      isActive
                        ? 'bg-primary/10 font-semibold text-primary'
                        : 'text-muted hover:bg-background-soft hover:text-foreground'
                    }`}
                  >
                    {child.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        
        {/* Message si pas de pages enfants */}
        {childPages.length === 0 && (
          <p className="text-sm text-muted-soft italic">
            Aucune sous-page disponible
          </p>
        )}
      </nav>
    </aside>
  );
}

