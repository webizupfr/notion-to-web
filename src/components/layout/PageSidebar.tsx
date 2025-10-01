'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Navigation item : section ou page
type NavItem = {
  type: 'section' | 'page';
  title: string;
  id?: string;
  slug?: string;
  children?: Array<{ id: string; title: string; slug: string }>;
};

type PageSidebarProps = {
  parentTitle: string;
  parentSlug: string;
  navigation: NavItem[];
};

export function PageSidebar({ parentTitle, parentSlug, navigation }: PageSidebarProps) {
  const pathname = usePathname();
  
  // Enlever le "/" initial pour comparer
  const currentPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  
  return (
    <aside className="sticky top-20 h-fit w-full max-w-xs">
      <nav className="surface-card rounded-3xl p-6">
        {/* Titre principal avec lien vers la page parent */}
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

        {/* Navigation hiérarchique */}
        {navigation.length > 0 && (
          <ul className="space-y-4">
            {navigation.map((item, idx) => {
              if (item.type === 'section' && item.children) {
                return (
                  <li key={`section-${idx}`}>
                    {/* Titre de la section (non cliquable) */}
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-soft">
                      {item.title}
                    </div>
                    
                    {/* Pages sous cette section */}
                    <ul className="space-y-1">
                      {item.children.map((child) => {
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
                      className={`block rounded-xl px-4 py-2.5 text-sm transition-all ${
                        isActive
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'text-muted hover:bg-background-soft hover:text-foreground'
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              }
              
              return null;
            })}
          </ul>
        )}
        
        {/* Message si pas de navigation */}
        {navigation.length === 0 && (
          <p className="text-sm text-muted-soft italic">
            Aucune sous-page disponible
          </p>
        )}
      </nav>
    </aside>
  );
}

