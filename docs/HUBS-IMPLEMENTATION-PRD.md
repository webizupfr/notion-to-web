# PRD : Implémentation des Hubs Pédagogiques

**Date** : 8 Octobre 2025  
**Version** : 1.0  
**Statut** : Ready for Implementation

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture actuelle](#architecture-actuelle)
3. [Architecture cible](#architecture-cible)
4. [Modifications Notion](#modifications-notion)
5. [Modifications Backend (Sync)](#modifications-backend-sync)
6. [Modifications Frontend](#modifications-frontend)
7. [Plan d'implémentation](#plan-dimplémentation)
8. [Tests et validation](#tests-et-validation)

---

## 🎯 Vue d'ensemble

### Objectif
Créer un système de **hubs pédagogiques** avec une synchronisation optimisée et une expérience utilisateur dédiée, distincte des pages standard et des articles de blog.

### Problématiques actuelles
- ❌ Pas de distinction entre pages standard et hubs pédagogiques
- ❌ Synchronisation identique pour tous types de contenu (pas optimisée)
- ❌ Pas de stratégie de cache adaptée par type
- ❌ Performances limitées pour les structures complexes (hubs avec child pages + databases)
- ❌ Pas d'interface dédiée pour naviguer dans les hubs

### Bénéfices attendus
- ✅ **Performance** : 2-3x plus rapide grâce à la sync optimisée
- ✅ **Clarté** : Séparation claire entre pages, posts et hubs
- ✅ **Expérience** : Navigation intuitive dans les hubs pédagogiques
- ✅ **Maintenabilité** : Code modulaire et logique séparée par type
- ✅ **Scalabilité** : Facilite l'ajout de nouveaux types de contenu

---

## 🏗️ Architecture actuelle

### Databases Notion
```
📊 PAGES_DB (process.env.NOTION_PAGES_DB)
   ├── Pages standard
   └── Hubs pédagogiques (non distingués)

📊 POSTS_DB (process.env.NOTION_POSTS_DB)
   └── Articles de blog
```

### Propriétés des pages
```
- Title (title)
- slug (rich_text)
- visibility (select: public/private)
- password (rich_text)
- excerpt (rich_text) - posts uniquement
```

### Logique de synchronisation
```typescript
// Une seule stratégie pour tous les types
async function runFullSync(force: boolean) {
  const [pages, posts] = await Promise.all([
    collectDatabasePages(PAGES_DB),
    collectDatabasePages(POSTS_DB),
  ]);
  
  // Sync séquentielle
  for (const page of pages) {
    await syncPage(page, { type: 'page', stats, force });
  }
  
  for (const post of posts) {
    await syncPage(post, { type: 'post', stats, force });
  }
}
```

### Frontend
```
/ → Page d'accueil statique
/blog → Index des articles
/blog/[slug] → Article individuel
/[...slug] → Toutes les pages dynamiques (standard + hubs mélangés)
```

### Fonctionnalités existantes
- ✅ **Sidebar avec navigation** : Détection des callouts 📌 pour créer des sections
- ✅ **Child pages** : Synchronisation récursive des pages enfants
- ✅ **Databases liées** : Sync des databases référencées dans les pages
- ✅ **Full-width** : Support du layout pleine largeur
- ✅ **Cache** : Vercel KV pour les pages et databases

---

## 🎯 Architecture cible

### Databases Notion (3 séparées)
```
📊 PAGES_DB (process.env.NOTION_PAGES_DB)
   └── Pages standard (contenu simple)

📊 POSTS_DB (process.env.NOTION_POSTS_DB)
   └── Articles de blog

📊 HUBS_DB (process.env.NOTION_HUBS_DB) 🆕
   └── Hubs pédagogiques (formations, cours, modules)
```

### Stratégies de synchronisation par type
```typescript
const SYNC_STRATEGIES = {
  PAGES_DB: {
    priority: 2,              // Priorité normale
    maxDepth: 1,              // Pas de child pages complexes
    batchSize: 5,             // Sync rapide
    delayMs: 350,             // Délai optimisé
    cacheTTL: 60 * 60 * 1000  // 1 heure
  },
  
  POSTS_DB: {
    priority: 3,              // Priorité basse
    maxDepth: 0,              // Pas de child pages
    batchSize: 10,            // Sync très rapide
    delayMs: 250,             // Délai court
    cacheTTL: 2 * 60 * 60 * 1000  // 2 heures
  },
  
  HUBS_DB: {
    priority: 1,              // Priorité haute
    maxDepth: 2,              // Hub → Child pages → Sous-pages
    batchSize: 2,             // Sync lente mais complète
    delayMs: 400,             // Délai standard
    cacheTTL: 30 * 60 * 1000  // 30 minutes
  }
};
```

### Frontend
```
/ → Page d'accueil statique
/blog → Index des articles
/blog/[slug] → Article individuel
/hubs → Index des hubs pédagogiques 🆕
/[...slug] → Pages dynamiques (détection automatique du type)
```

---

## 🔧 Modifications Notion

### 1. Créer la database HUBS_DB

**Actions dans Notion :**

1. **Créer une nouvelle database** nommée "DB Hubs"
2. **Copier l'ID de la database** et l'ajouter dans `.env.local` :
   ```bash
   NOTION_HUBS_DB=your_hubs_database_id_here
   ```

### 2. Propriétés obligatoires

```
📋 Propriétés de base (identiques aux pages)
- Title (title) - Titre du hub
- slug (rich_text) - URL du hub (ex: "formation-nextjs")
- visibility (select) - public ou private
- password (rich_text) - Optionnel, pour protection
```

### 3. Propriétés optionnelles pour optimisation

```
📋 Propriétés avancées (optionnelles, pour contrôle fin)
- description (rich_text) - Description courte du hub
- icon (select) - Emoji pour identifier le hub visuellement
- sync_strategy (select: full/shallow/deep)
  * full (défaut) - Sync complète avec child pages
  * shallow - Sync sans child pages
  * deep - Sync récursive profonde
- max_depth (number: 0,1,2,3)
  * Contrôle la profondeur de sync des child pages
  * Défaut: 2 (Hub → Child → Sous-page)
- sync_priority (number: 1,2,3)
  * 1 = haute, 2 = normale, 3 = basse
  * Défaut: 1 pour les hubs
```

### 4. Migration des pages existantes

**Identifier vos hubs actuels** dans PAGES_DB :
- Pages de type "formation", "cours", "module", "hub", etc.
- Pages avec des child pages complexes
- Pages avec des databases liées

**Les déplacer** vers HUBS_DB :
1. Dans Notion, ouvrir la page hub
2. Cliquer sur `...` → `Move to`
3. Sélectionner la database "Hubs Pédagogiques"
4. Renseigner les propriétés (slug, visibility, etc.)

### 5. Structure recommandée d'un hub

```
📁 Hub "Formation Next.js" (page dans HUBS_DB)
├── 📌 Callout "Section 1: Introduction"
│   ├── 📄 Child page: "Qu'est-ce que Next.js?"
│   └── 📄 Child page: "Installation"
│
├── 📌 Callout "Section 2: Concepts"
│   ├── 📄 Child page: "Routing"
│   └── 📄 Child page: "Data Fetching"
│
├── 📊 Database "Exercices" (inline database)
│   ├── 📄 Exercice 1
│   └── 📄 Exercice 2
│
└── 📊 Database "Projets" (linked database)
    ├── 📄 Projet 1
    └── 📄 Projet 2
```

**Règles importantes :**
- ✅ Les **callouts avec 📌** (punaise rouge) deviennent des **sections** dans la sidebar
- ✅ Les **child pages** sous ces callouts sont **groupées** dans la section
- ✅ Les **databases liées** sont synchronisées automatiquement
- ✅ La **profondeur maximale** est contrôlée par `max_depth` (défaut: 2)

---

## 🔄 Modifications Backend (Sync)

### 1. Variables d'environnement

**Fichier `.env.local` :**
```bash
# Databases existantes
NOTION_PAGES_DB=your_pages_db_id
NOTION_POSTS_DB=your_posts_db_id

# Nouvelle database pour les hubs
NOTION_HUBS_DB=your_hubs_db_id  # 🆕
```

### 2. Nouvelle fonction principale de sync

**Fichier `src/app/api/sync/route.ts` :**

```typescript
// Ajouter en haut du fichier
const HUBS_DB = process.env.NOTION_HUBS_DB;

// Remplacer la fonction runFullSync
export async function runFullSync(force: boolean = false) {
  if (!PAGES_DB || !POSTS_DB || !HUBS_DB) {
    throw new Error('Missing Notion database env vars');
  }

  const stats: SyncStats = { /* ... */ };
  const startedAt = Date.now();

  // PHASE 1: Synchroniser les hubs (priorité haute)
  console.log('[sync] 🚀 Phase 1: Syncing hubs...');
  const hubs = await collectDatabasePages(HUBS_DB);
  const hubsIndex: HubMeta[] = [];
  
  for (const hub of hubs) {
    const meta = await syncHub(hub, { stats, force });
    if (meta) {
      hubsIndex.push({
        slug: meta.slug,
        title: meta.title,
        description: firstRichText(hub.properties.description),
        icon: selectValue(hub.properties.icon),
        notionId: meta.notionId,
        visibility: meta.visibility,
        lastEdited: meta.lastEdited,
      });
    }
  }

  // Sauvegarder l'index des hubs
  await setHubsIndex({ items: hubsIndex, syncedAt: new Date().toISOString() });
  await revalidateTag('hubs:index');

  // PHASE 2: Synchroniser les pages standard (priorité normale)
  console.log('[sync] 🚀 Phase 2: Syncing standard pages...');
  const pages = await collectDatabasePages(PAGES_DB);
  
  for (const page of pages) {
    await syncPage(page, { type: 'page', stats, force });
  }

  // PHASE 3: Synchroniser les posts (priorité basse)
  console.log('[sync] 🚀 Phase 3: Syncing blog posts...');
  const posts = await collectDatabasePages(POSTS_DB);
  const postsIndex: PostMeta[] = [];
  
  for (const post of posts) {
    const meta = await syncPage(post, { type: 'post', stats, force });
    if (meta) {
      postsIndex.push({
        slug: meta.slug,
        title: meta.title,
        excerpt: firstRichText(post.properties.excerpt),
        notionId: meta.notionId,
        cover: meta.cover ?? null,
        lastEdited: meta.lastEdited,
      });
    }
  }

  await setPostsIndex({ items: postsIndex, syncedAt: new Date().toISOString() });
  await revalidateTag('posts:index');
  await revalidatePath('/blog', 'page');
  await revalidatePath('/hubs', 'page');

  const durationMs = Date.now() - startedAt;
  
  return {
    ok: true,
    synced: pages.length,
    posts: postsIndex.length,
    hubs: hubsIndex.length,
    metrics: { durationMs, ...stats }
  };
}
```

### 3. Fonction de synchronisation des hubs

**Ajouter dans `src/app/api/sync/route.ts` :**

```typescript
async function syncHub(
  hub: PageObjectResponse,
  opts: { stats: SyncStats; force?: boolean }
) {
  const slug = firstRichText(hub.properties.slug);
  if (!slug) return null;

  // Lire la configuration du hub
  const syncStrategy = selectValue(hub.properties.sync_strategy) || 'full';
  const maxDepth = Number(selectValue(hub.properties.max_depth)) || 2;
  const title = extractTitle(hub.properties.Title);
  
  console.log(`[sync] 🏠 Syncing hub "${title}" (strategy: ${syncStrategy}, maxDepth: ${maxDepth})`);

  // Synchroniser le hub comme une page normale
  const meta = await syncPage(hub, { type: 'page', stats: opts.stats, force: opts.force });
  
  if (!meta) return null;

  // Si strategy = 'shallow', on s'arrête là (pas de child pages)
  if (syncStrategy === 'shallow') {
    console.log(`[sync] ⏭️  Skipping children for hub "${slug}" (shallow strategy)`);
    return meta;
  }

  // Sinon, synchroniser les child pages avec la profondeur configurée
  const blocks = await pageBlocksDeep(hub.id, 100);
  const navigation = buildNavigationStructure(blocks, slug);
  
  if (syncStrategy === 'full' || syncStrategy === 'deep') {
    const syncedChildren = await syncChildPages(
      slug, 
      hub.id, 
      blocks, 
      { type: 'page', stats: opts.stats, force: opts.force },
      {
        parentTitle: meta.title,
        parentSlug: slug,
        parentNavigation: navigation,
        maxDepth: syncStrategy === 'deep' ? maxDepth + 1 : maxDepth
      }
    );
    
    console.log(`[sync] ✅ Hub "${slug}" synced with ${syncedChildren.length} children`);
  }

  return meta;
}
```

### 4. Modifier syncChildPages pour respecter maxDepth

**Dans `src/app/api/sync/route.ts`, modifier la fonction existante :**

```typescript
async function syncChildPages(
  parentSlug: string,
  parentPageId: string,
  blocks: NotionBlock[],
  opts: { type: 'page' | 'post'; stats: SyncStats; force?: boolean },
  parentInfo?: { 
    parentTitle: string; 
    parentSlug: string; 
    parentNavigation: NavItem[];
    maxDepth?: number;  // 🆕 Ajouter ce paramètre
  },
  currentDepth: number = 0  // 🆕 Ajouter ce paramètre
) {
  const maxDepth = parentInfo?.maxDepth ?? 2;
  
  // Vérifier la limite de profondeur
  if (currentDepth >= maxDepth) {
    console.log(`[syncChildPages] ⚠️  Max depth (${maxDepth}) reached for "${parentSlug}", skipping deeper children`);
    return [];
  }

  console.log(`[syncChildPages] 🔍 Syncing children at depth ${currentDepth}/${maxDepth} for "${parentSlug}"`);
  
  // ... reste du code existant ...
  
  // Lors de la sync récursive d'une child page, passer currentDepth + 1
  // (à implémenter dans la boucle de sync)
}
```

### 5. Optimisations de performance

**Parallélisation contrôlée :**

```typescript
// Utilitaire pour diviser en batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Synchroniser les hubs en parallèle
async function syncHubsInParallel(
  hubs: PageObjectResponse[],
  opts: { stats: SyncStats; force?: boolean }
) {
  const batches = chunkArray(hubs, 2); // 2 hubs en parallèle
  const results: HubMeta[] = [];
  
  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(hub => syncHub(hub, opts))
    );
    
    results.push(...batchResults.filter(Boolean) as HubMeta[]);
    
    // Délai entre les batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}
```

### 6. Cache intelligent

**Ajouter dans `src/lib/content-store.ts` :**

```typescript
export type HubMeta = {
  slug: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  notionId: string;
  visibility: "public" | "private";
  password?: string | null;
  lastEdited?: string;
  syncStrategy?: 'full' | 'shallow' | 'deep';
  maxDepth?: number;
  syncPriority?: number;
};

export type HubsIndex = {
  items: HubMeta[];
  syncedAt: string;
};

const hubsIndexKey = 'hubs:index';

export async function getHubsIndex(): Promise<HubsIndex | null> {
  if (!hasKv()) return null;
  try {
    return (await kv.get<HubsIndex>(hubsIndexKey)) ?? null;
  } catch (error) {
    console.error('KV getHubsIndex failed', error);
    return null;
  }
}

export async function setHubsIndex(index: HubsIndex) {
  if (!hasKv()) return;
  await kv.set(hubsIndexKey, index);
}
```

### 7. Mise à jour des types

**Dans `src/lib/types.ts` :**

```typescript
export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
  lastEdited?: string;
  
  // Navigation
  navigation?: NavItem[];
  parentSlug?: string;
  parentTitle?: string;
  parentNavigation?: NavItem[];
  childPages?: Array<{ id: string; title: string; slug: string }>;
  
  // 🆕 Propriétés pour les hubs
  description?: string | null;
  icon?: string | null;
  syncStrategy?: 'full' | 'shallow' | 'deep';
  maxDepth?: number;
  syncPriority?: number;
  isHub?: boolean;  // Flag pour identifier les hubs côté frontend
}
```

---

## 🎨 Modifications Frontend

### 1. Créer la page d'index des hubs

**Nouveau fichier `src/app/(site)/hubs/page.tsx` :**

```typescript
import { Container } from "@/components/layout/Container";
import { getHubsIndex } from "@/lib/content-store";
import { unstable_cache } from "next/cache";
import Link from "next/link";

export const revalidate = 0;

export default async function HubsIndex() {
  const hubsIndex = await unstable_cache(
    async () => await getHubsIndex(),
    ["hubs-index"],
    { tags: ["hubs:index"], revalidate: 60 }
  )();

  const hubs = hubsIndex?.items ?? [];

  return (
    <Container className="space-y-12 py-12">
      {/* En-tête */}
      <section className="space-y-5 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/50 backdrop-blur px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          Pédagogie
        </span>
        <div className="space-y-3">
          <h1 className="text-[2.3rem] font-semibold leading-[1.2] tracking-[-0.02em] text-slate-900">
            Hubs de formation
          </h1>
          <p className="max-w-2xl text-[1.05rem] leading-[1.7] text-slate-600">
            Explorez nos formations et modules d'apprentissage structurés.
          </p>
        </div>
      </section>

      {/* Grille des hubs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {hubs.map((hub) => (
          <Link
            key={hub.slug}
            href={`/${hub.slug}`}
            className="group rounded-2xl border border-slate-200/60 bg-white/40 backdrop-blur p-6 transition hover:border-emerald-400/60 hover:bg-white/60"
          >
            <div className="space-y-4">
              {hub.icon && (
                <div className="text-3xl">{hub.icon}</div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-slate-900 group-hover:text-emerald-600">
                  {hub.title}
                </h2>
                {hub.description && (
                  <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                    {hub.description}
                  </p>
                )}
              </div>
              <div className="flex items-center text-sm text-emerald-600 font-medium">
                <span>Explorer →</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* État vide */}
      {hubs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/40 backdrop-blur px-8 py-12 text-center text-sm text-slate-500">
          Aucun hub pédagogique pour le moment.<br />
          Synchronisez vos contenus Notion pour les voir apparaître ici.
        </div>
      )}
    </Container>
  );
}
```

### 2. Adapter la page dynamique pour les hubs

**Modifier `src/app/(site)/[...slug]/page.tsx` :**

```typescript
export default async function Page({ params, searchParams }) {
  // ... code existant ...
  
  const bundle = await unstable_cache(
    async () => await getPageBundle(slug),
    [`page-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 }
  )();
  
  if (!bundle) return notFound();
  const { meta, blocks } = bundle;

  // ... gestion de la sécurité existante ...

  if (!blocks?.length) {
    return notFound();
  }

  // 🆕 Détecter si c'est un hub
  const isHub = Boolean(
    meta.syncStrategy || 
    meta.maxDepth || 
    meta.syncPriority ||
    meta.isHub
  );

  // Déterminer si on affiche avec sidebar
  const hasNavigation = meta.navigation && meta.navigation.length > 0;
  const isParentWithNav = meta.fullWidth && hasNavigation;
  const isChildWithParent = meta.parentSlug && meta.parentNavigation;
  const showSidebar = isParentWithNav || isChildWithParent;

  if (showSidebar) {
    const navTitle = isChildWithParent ? meta.parentTitle! : meta.title;
    const navSlug = isChildWithParent ? meta.parentSlug! : slug;
    const navigation = isChildWithParent ? meta.parentNavigation! : meta.navigation!;
    
    return (
      <div className="mx-auto flex w-full max-w-[1800px] gap-12">
        {/* Sidebar */}
        <div className="hidden lg:block lg:flex-shrink-0">
          <PageSidebar
            parentTitle={navTitle}
            parentSlug={navSlug}
            navigation={navigation}
            isHub={isHub}  // 🆕 Passer le flag
            hubDescription={isHub ? meta.description : undefined}  // 🆕
            hubIcon={isHub ? meta.icon : undefined}  // 🆕
          />
        </div>
        
        {/* Sidebar mobile */}
        <div className="lg:hidden">
          <PageSidebar
            parentTitle={navTitle}
            parentSlug={navSlug}
            navigation={navigation}
            isHub={isHub}
            hubDescription={isHub ? meta.description : undefined}
            hubIcon={isHub ? meta.icon : undefined}
          />
        </div>
        
        {/* Contenu */}
        <section className="flex-1 min-w-0">
          {/* 🆕 En-tête spécial pour les hubs */}
          {isHub && !isChildWithParent && (
            <div className="mb-8 space-y-4 pb-8 border-b border-slate-200/60">
              {meta.icon && (
                <div className="text-4xl">{meta.icon}</div>
              )}
              <div>
                <h1 className="text-3xl font-semibold text-slate-900">
                  {meta.title}
                </h1>
                {meta.description && (
                  <p className="mt-3 text-lg text-slate-600">
                    {meta.description}
                  </p>
                )}
              </div>
            </div>
          )}
          
          <Blocks blocks={blocks} currentSlug={slug} />
        </section>
      </div>
    );
  }

  // Layout classique pour pages sans navigation
  const wrapperClass = meta.fullWidth
    ? "mx-auto flex w-full max-w-[1800px] flex-col gap-12"
    : "mx-auto flex w-full max-w-4xl flex-col gap-12";

  return (
    <section className={wrapperClass}>
      <Blocks blocks={blocks} currentSlug={slug} />
    </section>
  );
}
```

### 3. Adapter la PageSidebar pour les hubs

**Modifier `src/components/layout/PageSidebar.tsx` :**

```typescript
interface PageSidebarProps {
  parentTitle: string;
  parentSlug: string;
  navigation: NavItem[];
  isHub?: boolean;  // 🆕
  hubDescription?: string | null;  // 🆕
  hubIcon?: string | null;  // 🆕
}

export function PageSidebar({ 
  parentTitle, 
  parentSlug, 
  navigation,
  isHub = false,
  hubDescription,
  hubIcon
}: PageSidebarProps) {
  // ... code existant de la sidebar mobile ...

  return (
    <>
      {/* Sidebar desktop */}
      <aside className="sticky top-8 hidden h-fit w-64 lg:block">
        <nav className="space-y-6">
          {/* 🆕 En-tête du hub si applicable */}
          {isHub && (
            <div className="space-y-3 pb-6 border-b border-slate-200/60">
              {hubIcon && (
                <div className="text-2xl">{hubIcon}</div>
              )}
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {parentTitle}
                </h2>
                {hubDescription && (
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {hubDescription}
                  </p>
                )}
              </div>
            </div>
          )}
          
          {!isHub && (
            <div className="pb-4 border-b border-slate-200/60">
              <Link
                href={`/${parentSlug}`}
                className="text-sm font-semibold text-slate-900 hover:text-emerald-600 transition-colors"
              >
                {parentTitle}
              </Link>
            </div>
          )}

          {/* Navigation existante */}
          <div className="space-y-1">
            {navigation.map((item, index) => (
              <div key={index}>
                {item.type === 'section' ? (
                  <div className="space-y-1">
                    <h3 className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                      {item.title}
                    </h3>
                    {item.children && (
                      <div className="space-y-0.5">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={`/${child.slug}`}
                            className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={`/${item.slug}`}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* Sidebar mobile - adapter de la même façon */}
      {/* ... */}
    </>
  );
}
```

### 4. Ajouter un lien vers les hubs dans la page d'accueil

**Modifier `src/app/(site)/page.tsx` :**

```typescript
// Dans la section des liens (ligne 45-58)
<div className="flex flex-wrap items-center gap-4">
  <Link
    href="/hubs"  // 🆕
    className="rounded-full bg-emerald-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
  >
    Découvrir les formations
  </Link>
  <Link
    href="/blog"
    className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-emerald-400/60"
  >
    Consulter le journal
  </Link>
</div>
```

### 5. Mettre à jour le Header (optionnel)

**Modifier `src/components/layout/Header.tsx` :**

Ajouter un lien "Formations" dans la navigation si vous en avez une.

---

## 📝 Plan d'implémentation

### Phase 1 : Préparation Notion ✅
- [ ] Créer la database HUBS_DB dans Notion
- [ ] Ajouter les propriétés (Title, slug, visibility, password, description, icon)
- [ ] Migrer les pages hub existantes de PAGES_DB vers HUBS_DB
- [ ] Copier l'ID de la database et l'ajouter dans `.env.local`
- [ ] Vérifier la structure d'un hub (callouts 📌, child pages, databases)

### Phase 2 : Backend - Types et Cache
- [ ] Mettre à jour `src/lib/types.ts` (ajouter propriétés hub dans PageMeta)
- [ ] Étendre `src/lib/content-store.ts` :
  - [ ] Ajouter type `HubMeta`
  - [ ] Ajouter type `HubsIndex`
  - [ ] Ajouter fonction `getHubsIndex()`
  - [ ] Ajouter fonction `setHubsIndex()`

### Phase 3 : Backend - Logique de Sync
- [ ] Dans `src/app/api/sync/route.ts` :
  - [ ] Ajouter variable `HUBS_DB`
  - [ ] Créer fonction `syncHub()`
  - [ ] Modifier fonction `syncChildPages()` pour gérer `maxDepth` et `currentDepth`
  - [ ] Créer utilitaire `chunkArray()`
  - [ ] Refactorer `runFullSync()` en 3 phases (hubs, pages, posts)
  - [ ] Ajouter parallélisation des hubs avec `syncHubsInParallel()`
  - [ ] Mettre à jour `SyncStats` pour inclure les hubs

### Phase 4 : Frontend - Page d'index des hubs
- [ ] Créer `src/app/(site)/hubs/page.tsx`
- [ ] Implémenter la grille des hubs avec design cards
- [ ] Gérer l'état vide
- [ ] Tester le cache et la revalidation

### Phase 5 : Frontend - Adaptation des pages dynamiques
- [ ] Modifier `src/app/(site)/[...slug]/page.tsx` :
  - [ ] Ajouter détection des hubs (`isHub`)
  - [ ] Ajouter en-tête spécial pour les hubs
  - [ ] Passer les props `isHub`, `hubDescription`, `hubIcon` à PageSidebar
- [ ] Modifier `src/components/layout/PageSidebar.tsx` :
  - [ ] Accepter les nouvelles props
  - [ ] Ajouter section d'en-tête pour les hubs
  - [ ] Adapter le style pour les hubs

### Phase 6 : Frontend - Navigation
- [ ] Modifier `src/app/(site)/page.tsx` :
  - [ ] Ajouter lien "Découvrir les formations" vers `/hubs`
- [ ] (Optionnel) Modifier `src/components/layout/Header.tsx` :
  - [ ] Ajouter lien "Formations" dans la nav

### Phase 7 : Tests et Validation
- [ ] Tester la sync complète (dev)
- [ ] Vérifier l'index des hubs `/hubs`
- [ ] Vérifier l'affichage d'un hub avec navigation
- [ ] Vérifier les child pages d'un hub
- [ ] Tester la limite de profondeur (`maxDepth`)
- [ ] Vérifier les databases liées dans les hubs
- [ ] Tester les 3 stratégies de sync (full, shallow, deep)
- [ ] Vérifier la performance (temps de sync)

### Phase 8 : Déploiement
- [ ] Ajouter `NOTION_HUBS_DB` dans les variables d'environnement Vercel
- [ ] Déployer sur preview
- [ ] Tester la sync en production
- [ ] Déclencher une sync complète
- [ ] Vérifier tous les hubs et leur navigation
- [ ] Monitoring des performances

---

## 🧪 Tests et validation

### Tests unitaires
```bash
# Tester la sync d'un hub spécifique
npm run sync:force

# Vérifier les logs de sync
# → Devrait montrer 3 phases
# → Phase 1: Syncing hubs...
# → Phase 2: Syncing standard pages...
# → Phase 3: Syncing blog posts...
```

### Tests manuels

#### 1. Index des hubs
- [ ] Naviguer vers `/hubs`
- [ ] Vérifier que tous les hubs sont listés
- [ ] Vérifier les icônes et descriptions
- [ ] Cliquer sur un hub → doit rediriger vers la page du hub

#### 2. Page hub avec navigation
- [ ] Ouvrir un hub (ex: `/formation-nextjs`)
- [ ] Vérifier la sidebar avec les sections (callouts 📌)
- [ ] Vérifier les child pages groupées sous les sections
- [ ] Cliquer sur une child page → doit conserver la sidebar
- [ ] Vérifier l'en-tête du hub (icône, titre, description)

#### 3. Profondeur de sync
- [ ] Hub avec `max_depth = 1` → child pages uniquement
- [ ] Hub avec `max_depth = 2` → child pages + sous-pages
- [ ] Hub avec `max_depth = 0` → pas de child pages

#### 4. Stratégies de sync
- [ ] Hub avec `sync_strategy = shallow` → pas de child pages
- [ ] Hub avec `sync_strategy = full` → child pages normales
- [ ] Hub avec `sync_strategy = deep` → child pages profondes

#### 5. Databases liées
- [ ] Hub avec database inline → vérifier le rendu
- [ ] Hub avec database linked → vérifier le rendu
- [ ] Child page d'une database → vérifier l'URL et le contenu

#### 6. Performance
- [ ] Mesurer le temps de sync avant/après
- [ ] Vérifier les logs de parallélisation
- [ ] Vérifier le cache (Vercel KV)
- [ ] Vérifier les métriques de sync

### Métriques de succès
- ✅ Temps de sync réduit de 50%+ pour les hubs
- ✅ Tous les hubs visibles dans `/hubs`
- ✅ Navigation fonctionnelle avec sidebar
- ✅ Child pages accessibles et correctement imbriquées
- ✅ Databases liées synchronisées
- ✅ Aucune erreur de sync
- ✅ Cache correctement invalidé après sync

---

## 🎯 Résumé des bénéfices

### Pour le backend (sync)
- ✅ **Performance** : 2-3x plus rapide avec parallélisation
- ✅ **Scalabilité** : Stratégies adaptées par type de contenu
- ✅ **Contrôle** : Max depth et sync strategy configurables
- ✅ **Maintenabilité** : Code modulaire et séparé par type

### Pour le frontend
- ✅ **Expérience** : Interface dédiée aux hubs pédagogiques
- ✅ **Navigation** : Sidebar avec sections et child pages
- ✅ **Design** : Style adapté aux hubs vs pages standard
- ✅ **Découvrabilité** : Page d'index pour explorer les hubs

### Pour Notion
- ✅ **Organisation** : 3 databases séparées et claires
- ✅ **Flexibilité** : Propriétés configurables par hub
- ✅ **Simplicité** : Structure intuitive (callouts 📌 → sections)

---

## 📚 Annexes

### Commandes utiles

```bash
# Sync en développement
npm run sync:force

# Sync en production
npm run sync:prod:force

# Vérifier l'index des hubs
curl https://votre-site.com/api/debug/list

# Vérifier une page hub spécifique
curl https://votre-site.com/api/debug/formation-nextjs
```

### Variables d'environnement complètes

```bash
# Notion
NOTION_TOKEN=your_notion_integration_token
NOTION_PAGES_DB=your_pages_database_id
NOTION_POSTS_DB=your_posts_database_id
NOTION_HUBS_DB=your_hubs_database_id  # 🆕

# Vercel KV
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token

# QStash (pour la sync en background)
QSTASH_TOKEN=your_qstash_token

# Autres
CRON_SECRET=your_cron_secret
NEXT_PUBLIC_SITE_URL=https://votre-site.com
SYNC_FAILURE_WEBHOOK=your_webhook_url
```

### Structure de fichiers finale

```
src/
├── app/
│   ├── (site)/
│   │   ├── [...slug]/
│   │   │   └── page.tsx (modifié)
│   │   ├── blog/
│   │   │   ├── [slug]/page.tsx
│   │   │   └── page.tsx
│   │   ├── hubs/
│   │   │   └── page.tsx (🆕)
│   │   ├── layout.tsx
│   │   └── page.tsx (modifié)
│   └── api/
│       └── sync/
│           └── route.ts (modifié)
├── components/
│   └── layout/
│       ├── PageSidebar.tsx (modifié)
│       └── ...
└── lib/
    ├── content-store.ts (modifié)
    ├── types.ts (modifié)
    └── ...
```

---

**Prêt pour l'implémentation ! 🚀**

Ce document servira de guide complet tout au long du développement.

