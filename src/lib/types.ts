// Élément de navigation : section (callout 📌) ou page enfant
export type NavItem = {
  type: 'section' | 'page';
  title: string;
  // Pour les pages
  id?: string;
  slug?: string;
  // Pour les sections, les pages enfants sous cette section
  children?: Array<{ id: string; title: string; slug: string }>;
};

export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
  lastEdited?: string;
  // Navigation hiérarchique (sections + pages groupées)
  navigation?: NavItem[];
  // Infos du parent (pour afficher la sidebar sur les child pages)
  parentSlug?: string;
  parentTitle?: string;
  parentNavigation?: NavItem[];
  // Ancien format (deprecated, gardé pour compatibilité)
  childPages?: Array<{ id: string; title: string; slug: string }>;
}
export type PostMeta = { 
  slug: string; 
  title: string; 
  excerpt?: string|null; 
  notionId: string; 
  cover?: string|null;
  lastEdited?: string;
}
