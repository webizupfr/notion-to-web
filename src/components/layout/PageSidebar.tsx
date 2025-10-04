'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

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
  const [isOpen, setIsOpen] = useState(false);
  
  // Enlever le "/" initial pour comparer
  const currentPath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
  
  return (
    <>
      {/* Bouton toggle mobile */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
      >
        <span className="text-lg">📖</span>
        <span className="font-medium">{parentTitle}</span>
        <span className="text-lg">{isOpen ? '✕' : '☰'}</span>
      </button>

      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-full max-w-xs border-r-2 border-primary/20 bg-background-soft/30 backdrop-blur-sm shadow-lg z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
      <nav className="flex h-full flex-col overflow-y-auto px-6 py-8">
        {/* Titre principal avec lien vers la page parent */}
        <div className="mb-8 pb-6 border-b border-border/30">
          <Link 
            href={`/${parentSlug}`}
            className={`group flex items-center gap-2 text-xl font-bold transition-all ${
              currentPath === parentSlug
                ? 'text-primary'
                : 'text-foreground hover:text-primary hover:translate-x-1'
            }`}
            onClick={() => setIsOpen(false)} // Fermer sur mobile après clic
          >
            <span className={`text-2xl transition-transform ${
              currentPath === parentSlug ? 'scale-110' : 'group-hover:scale-110'
            }`}>📖</span>
            {parentTitle}
          </Link>
        </div>

        {/* Navigation hiérarchique */}
        {navigation.length > 0 && (
          <ul className="flex-1 space-y-6">
            {navigation.map((item, idx) => {
              if (item.type === 'section' && item.children) {
                return (
                  <li key={`section-${idx}`}>
                    {/* Titre de la section avec style premium */}
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-border/40 to-transparent"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary/70">
                        {item.title}
                      </span>
                      <div className="h-px flex-1 bg-gradient-to-l from-border/40 to-transparent"></div>
                    </div>
                    
                    {/* Pages sous cette section avec indicateur */}
                    <ul className="space-y-1">
                      {item.children.map((child) => {
                        const isActive = currentPath === child.slug;
                        
                        return (
                          <li key={child.id}>
                            <Link
                              href={`/${child.slug}`}
                              className={`group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-primary/10 text-primary shadow-sm'
                                  : 'text-muted hover:bg-background-soft hover:text-foreground hover:translate-x-1'
                              }`}
                              onClick={() => setIsOpen(false)} // Fermer sur mobile après clic
                            >
                              {/* Indicateur gauche pour page active */}
                              <span className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all ${
                                isActive 
                                  ? 'bg-primary' 
                                  : 'bg-transparent group-hover:bg-primary/30'
                              }`}></span>
                              
                              {/* Icône */}
                              <span className={`text-lg transition-transform ${
                                isActive ? 'scale-110' : 'group-hover:scale-110'
                              }`}>
                                {isActive ? '📄' : '📃'}
                              </span>
                              
                              {/* Titre */}
                              <span className="flex-1">{child.title}</span>
                              
                              {/* Flèche pour page active */}
                              {isActive && (
                                <span className="text-primary">→</span>
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
                      className={`group relative flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary/10 text-primary shadow-sm'
                          : 'text-muted hover:bg-background-soft hover:text-foreground hover:translate-x-1'
                      }`}
                      onClick={() => setIsOpen(false)} // Fermer sur mobile après clic
                    >
                      <span className={`absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full transition-all ${
                        isActive ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/30'
                      }`}></span>
                      <span className={`text-lg transition-transform ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`}>
                        {isActive ? '📄' : '📃'}
                      </span>
                      <span className="flex-1">{item.title}</span>
                      {isActive && <span className="text-primary">→</span>}
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
    </>
  );
}

