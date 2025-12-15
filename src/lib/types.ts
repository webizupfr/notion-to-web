import type {
  HubMeta as HubMetaConfig,
  DayMeta as DayMetaConfig,
  CohortMeta as CohortMetaConfig,
  WorkshopMeta as WorkshopMetaConfig,
  SprintMeta as SprintMetaConfig,
  ModuleMeta as ModuleMetaConfig,
} from '@/lib/meta-schemas';

// Élément de navigation : section (callout 📌) ou page enfant
export type NavItem = {
  type: 'section' | 'page';
  title: string;
  // Pour les pages
  id?: string;
  slug?: string;
  icon?: string | null;
  // Pour les sections, les pages enfants sous cette section
  children?: Array<{ id: string; title: string; slug: string; icon?: string | null }>;
};

export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
  lastEdited?: string;
  // Univers de positionnement (déterminé par Notion ou par le slug)
  univers?: "studio" | "lab";
  // Typologie de page (optionnelle)
  pageType?: "landing" | "article" | "offre" | "programme";
  // Navigation hiérarchique (sections + pages groupées)
  navigation?: NavItem[];
  // Infos du parent (pour afficher la sidebar sur les child pages)
  parentSlug?: string;
  parentTitle?: string;
  parentNavigation?: NavItem[];
  parentIcon?: string | null;
  // Ancien format (deprecated, gardé pour compatibilité)
  childPages?: Array<{ id: string; title: string; slug: string }>;

  // Hubs pédagogiques
  description?: string | null;
  icon?: string | null;
  syncStrategy?: "full" | "shallow" | "deep";
  maxDepth?: number;
  syncPriority?: number;
  isHub?: boolean;
  learningPath?: LearningPath;
  hubSettings?: HubMetaConfig | null;
};
export type PostMeta = { 
  slug: string; 
  title: string; 
  excerpt?: string|null; 
  notionId: string; 
  cover?: string|null;
  lastEdited?: string;
}

export type HubMeta = {
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  notionId: string;
  visibility: "public" | "private";
  password?: string | null;
  lastEdited?: string;
  syncStrategy?: "full" | "shallow" | "deep";
  maxDepth?: number;
  syncPriority?: number;
  settings?: HubMetaConfig | null;
};

// Learning path types for hubs
export type ActivityStep = {
  id: string;
  order: number;
  title: string;
  type?: string | null;
  duration?: string | number | null;
  url?: string | null;
  instructions?: string | null;
};

export type DayEntry = {
  id: string;
  order: number;
  slug: string;
  title: string;
  summary?: string | null;
  state?: string | null; // ouvert/verrouille etc.
  unlockDate?: string | null;
  unlockOffsetDays?: number | null;
  steps: ActivityStep[];
  settings?: DayMetaConfig | null;
};

export type LearningPath = {
  days: DayEntry[];
  kind?: 'days' | 'modules';
  unitLabelSingular?: string;
  unitLabelPlural?: string;
};

export type CohortMeta = {
  slug: string;
  hubNotionId: string;
  hubNotionIds?: string[];
  startDate: string;
  endDate?: string | null;
  timezone: string;
  visibility: 'public' | 'private';
  password?: string | null;
  scheduleMode: 'relative' | 'absolute';
  unitLabelSingular?: string | null;
  unitLabelPlural?: string | null;
  settings?: CohortMetaConfig | null;
};

export type WorkshopSettings = WorkshopMetaConfig;
export type SprintSettings = SprintMetaConfig;
export type ModuleSettings = ModuleMetaConfig;

declare module './types' {}
