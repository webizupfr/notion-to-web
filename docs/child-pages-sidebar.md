# 📚 Pages enfants et sidebar de navigation

*Documentation de la fonctionnalité de synchronisation des child pages avec sidebar automatique*

---

## 🎯 Problème résolu

### Avant
- Les **child pages** (pages imbriquées dans Notion) n'étaient **pas synchronisées**
- Impossible d'accéder directement à `/documentation/getting-started`
- Pas de navigation latérale pour les pages full-width type documentation

### Après
- ✅ **Child pages automatiquement synchronisées** comme pages individuelles
- ✅ **Sidebar de navigation** générée automatiquement
- ✅ **URLs propres** basées sur les titres des pages
- ✅ **Layout app-like** pour pages full-width avec navigation

---

## 📋 Fonctionnement

### Détection automatique

Lors du sync, le système :
1. **Détecte** tous les blocs `child_page` dans une page
2. **Synchronise** chaque child page comme une page complète
3. **Génère** des slugs depuis les titres (kebab-case)
4. **Enregistre** la liste des child pages dans les métadonnées parent
5. **Affiche** une sidebar si la page est full-width ET a des child pages

### Structure Notion → URLs

```
📄 Page "documentation" (slug: "documentation", full-width: true)
   ├── 📄 Getting Started
   ├── 📄 Using Aether
   └── 📄 Blocks

URLs générées :
✅ /documentation                → Page principale
✅ /documentation/getting-started → Child page 1
✅ /documentation/using-aether    → Child page 2
✅ /documentation/blocks          → Child page 3
```

---

## 🎨 Layouts disponibles

### 1. Layout avec sidebar (automatique)

**Conditions :**
- Page avec `full_width: true` dans Notion
- Page contient des **child pages**

**Résultat :**
```
┌─────────────────────────────────────┐
│ ┌──────────┐  ┌──────────────────┐ │
│ │          │  │                  │ │
│ │ Sidebar  │  │   Contenu        │ │
│ │          │  │   principal      │ │
│ │ • Page 1 │  │                  │ │
│ │ • Page 2 │  │                  │ │
│ │ • Page 3 │  │                  │ │
│ │          │  │                  │ │
│ └──────────┘  └──────────────────┘ │
└─────────────────────────────────────┘
```

**Largeur max :** 1800px

### 2. Layout full-width classique

**Conditions :**
- Page avec `full_width: true` dans Notion
- **Aucune child page**

**Résultat :**
```
┌─────────────────────────────────────┐
│                                     │
│         Contenu full-width          │
│                                     │
└─────────────────────────────────────┘
```

**Largeur max :** 1800px

### 3. Layout standard

**Conditions :**
- Page avec `full_width: false` (défaut)

**Résultat :**
```
    ┌─────────────────────┐
    │                     │
    │  Contenu standard   │
    │                     │
    └─────────────────────┘
```

**Largeur max :** 4xl (~896px)

---

## 🛠️ Implémentation technique

### 1. Synchronisation des child pages

**Fichier :** `src/app/api/sync/route.ts`

**Fonction principale :** `syncChildPages()`

```typescript
// 1. Collecter les child pages
function collectChildPageBlocks(blocks: NotionBlock[]): Array<{ id: string; title: string }>

// 2. Synchroniser chaque child page
async function syncChildPages(
  parentSlug: string,
  parentPageId: string,
  blocks: NotionBlock[],
  opts: { type: 'page' | 'post'; stats: SyncStats; force?: boolean }
)
```

**Algorithme :**
1. Parcourt tous les blocs récursivement
2. Détecte les blocs de type `child_page`
3. Pour chaque child page :
   - Récupère les données complètes via l'API Notion
   - Génère un slug depuis le titre (kebab-case)
   - Crée un slug complet : `parent/child`
   - Synchronise comme une page normale
   - Ajoute aux métadonnées du parent

### 2. Génération de slugs

**Transformation :** Titre → kebab-case

```typescript
const titleSlug = title
  .toLowerCase()
  .normalize('NFD')                      // Décomposer les accents
  .replace(/[\u0300-\u036f]/g, '')      // Supprimer les accents
  .replace(/[^a-z0-9\s-]/g, '')         // Garder seulement a-z, 0-9, espaces, tirets
  .replace(/\s+/g, '-')                 // Espaces → tirets
  .replace(/-+/g, '-')                  // Tirets multiples → simple
  .replace(/^-|-$/g, '');               // Trim tirets début/fin
```

**Exemples :**
```
"Getting Started"          → "getting-started"
"Using Aether"             → "using-aether"
"Blocks"                   → "blocks"
"Configuration avancée"    → "configuration-avancee"
"API & Intégrations"       → "api-integrations"
```

### 3. Métadonnées enrichies

**Type :** `PageMeta` (modifié)

```typescript
export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
  childPages?: Array<{      // ← NOUVEAU
    id: string;
    title: string;
    slug: string;
  }>;
}
```

### 4. Composant Sidebar

**Fichier :** `src/components/layout/PageSidebar.tsx`

**Props :**
```typescript
type PageSidebarProps = {
  parentTitle: string;
  parentSlug: string;
  childPages: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
};
```

**Fonctionnalités :**
- ✅ Sticky (reste visible au scroll)
- ✅ Highlight de la page active
- ✅ Transitions fluides
- ✅ Style cohérent avec le design system

### 5. Layout conditionnel

**Fichier :** `src/app/(site)/[...slug]/page.tsx`

**Logique :**
```typescript
const hasChildPages = meta.childPages && meta.childPages.length > 0;
const showSidebar = meta.fullWidth && hasChildPages;

if (showSidebar) {
  // Layout avec sidebar
  return (
    <div className="flex gap-12">
      <PageSidebar ... />
      <section className="flex-1">
        <Blocks ... />
      </section>
    </div>
  );
}

// Layout classique
return (
  <section className={wrapperClass}>
    <Blocks ... />
  </section>
);
```

---

## 📝 Comment utiliser

### Étape 1 : Créer une page parent dans Notion

1. Créer une page dans votre base "Pages"
2. Ajouter les propriétés :
   - `slug`: ex. "documentation"
   - `Title`: ex. "Documentation"
   - Activer **Full width** dans Notion

### Étape 2 : Ajouter des child pages

Dans la page parent Notion :
1. Cliquer sur "+ New page" ou taper `/page`
2. Créer une page enfant (par exemple "Getting Started")
3. Remplir le contenu
4. Répéter pour chaque section

**Structure recommandée :**
```
📄 Documentation
   ├── 📄 Getting Started
   ├── 📄 Installation
   ├── 📄 Configuration
   └── 📄 API Reference
```

### Étape 3 : Synchroniser

```bash
curl "https://votre-site.com/api/sync?secret=VOTRE_SECRET&force=1"
```

**Logs attendus :**
```
[sync] Found 4 child pages in page "documentation"
[sync] Syncing child page: documentation/getting-started (Getting Started)
[sync] Syncing child page: documentation/installation (Installation)
[sync] Syncing child page: documentation/configuration (Configuration)
[sync] Syncing child page: documentation/api-reference (API Reference)
```

### Étape 4 : Vérifier

1. **Page parent** : `https://votre-site.com/documentation`
   - Devrait afficher la sidebar à gauche
   - Contenu principal à droite

2. **Pages enfants** : 
   - `https://votre-site.com/documentation/getting-started`
   - `https://votre-site.com/documentation/installation`
   - etc.

---

## 🎨 Personnalisation du style

### Modifier la sidebar

**Fichier :** `src/components/layout/PageSidebar.tsx`

**Largeur de la sidebar :**
```tsx
<aside className="sticky top-20 h-fit w-full max-w-xs">
  {/* max-w-xs = 320px, changer selon besoin */}
</aside>
```

**Style des liens :**
```tsx
className={`block rounded-xl px-4 py-2.5 text-sm transition-all ${
  isActive
    ? 'bg-primary/10 font-semibold text-primary'  // Lien actif
    : 'text-muted hover:bg-background-soft hover:text-foreground'  // Lien normal
}`}
```

### Modifier l'espacement

**Fichier :** `src/app/(site)/[...slug]/page.tsx`

```tsx
<div className="mx-auto flex w-full max-w-[1800px] gap-12">
  {/* gap-12 = 48px, ajuster selon besoin */}
</div>
```

### Ajouter des icônes aux liens

```tsx
// Dans PageSidebar.tsx
<Link href={`/${child.slug}`}>
  <span className="mr-2">📄</span>
  {child.title}
</Link>
```

---

## 🧪 Testing

### Test 1 : Child pages détectées

```bash
# Vérifier les logs de sync
curl "https://votre-site.com/api/sync?secret=XXX&force=1" | jq '.metrics.childPagesSynced'

# Devrait retourner le nombre de child pages synchronisées
```

### Test 2 : URLs accessibles

```bash
# Tester chaque URL
curl -I "https://votre-site.com/documentation/getting-started"
# Devrait retourner 200 OK
```

### Test 3 : Sidebar affichée

1. Ouvrir `/documentation` dans le navigateur
2. Vérifier :
   - ✅ Sidebar présente à gauche
   - ✅ Liste des child pages visible
   - ✅ Page active highlightée
   - ✅ Navigation fonctionnelle

### Test 4 : Responsive

1. Réduire la fenêtre (mobile)
2. Vérifier que la sidebar :
   - Se cache ou s'adapte
   - Reste accessible (ajouter un toggle si nécessaire)

---

## 🔧 Troubleshooting

### Child pages non synchronisées

**Symptôme :** `childPagesSynced: 0` dans les métriques

**Causes possibles :**
1. La page parent n'a pas de child pages
2. Les child pages ne sont pas accessibles à l'intégration
3. Erreur lors de la récupération des données

**Solution :**
```bash
# Vérifier les logs
[sync] Found 0 child pages in page "..."

# Vérifier dans Notion que :
- Les pages sont bien des "child pages" (imbriquées)
- L'intégration a accès à toutes les pages
- Les pages ne sont pas archivées
```

### Sidebar non affichée

**Symptôme :** Pas de sidebar sur la page full-width

**Vérifications :**
1. La page a `full_width: true` dans Notion ?
2. La page a des child pages synchronisées ?
3. Les métadonnées contiennent `childPages` ?

```typescript
// Debugger dans page.tsx
console.log('Full width:', meta.fullWidth);
console.log('Child pages:', meta.childPages);
console.log('Show sidebar:', showSidebar);
```

### URLs 404

**Symptôme :** `/documentation/getting-started` → 404

**Causes :**
1. Child page non synchronisée
2. Slug incorrect
3. Cache non invalidé

**Solution :**
```bash
# Re-sync avec force
curl "https://votre-site.com/api/sync?secret=XXX&force=1"

# Vérifier le cache
# Si KV, vérifier la clé page:documentation/getting-started
```

### Slugs avec caractères spéciaux

**Symptôme :** Titre "API & Services" → URL bizarre

**Solution :**
Le système nettoie automatiquement :
- `API & Services` → `api-services`
- `C'est cool!` → `cest-cool`

Si besoin, créer une propriété `slug` manuelle dans la child page.

---

## 📈 Métriques

### Nouvelles métriques de sync

```json
{
  "ok": true,
  "metrics": {
    "databaseChildrenSynced": 5,
    "childPagesSynced": 12,      // ← NOUVEAU
    ...
  }
}
```

**Interprétation :**
- `databaseChildrenSynced` : items de databases synchronisés
- `childPagesSynced` : child pages synchronisées

---

## 🚀 Cas d'usage

### 1. Documentation produit

**Structure Notion :**
```
📄 Documentation (full-width)
   ├── 📄 Introduction
   ├── 📄 Quick Start
   ├── 📄 API Reference
   ├── 📄 Examples
   └── 📄 FAQ
```

**Résultat :** Site de documentation avec navigation latérale type GitBook/Docusaurus

### 2. Knowledge base

**Structure Notion :**
```
📄 Base de connaissances (full-width)
   ├── 📄 Guides
   ├── 📄 Tutoriels
   ├── 📄 Best Practices
   └── 📄 Troubleshooting
```

**Résultat :** Base de connaissances organisée avec navigation

### 3. Guide utilisateur

**Structure Notion :**
```
📄 Guide utilisateur (full-width)
   ├── 📄 Premiers pas
   ├── 📄 Fonctionnalités
   ├── 📄 Configuration avancée
   └── 📄 Support
```

**Résultat :** Guide avec chapitres navigables

---

## 💡 Bonnes pratiques

### Nommage des child pages

✅ **Bon :**
- "Getting Started"
- "Installation Guide"
- "API Reference"

❌ **À éviter :**
- "Page 1" (pas descriptif)
- "test" (trop court)
- "!!!IMPORTANT!!!" (caractères spéciaux)

### Organisation

1. **Garder une hiérarchie plate** (1 niveau)
   - Parent → Child pages
   - Éviter : Parent → Child → Grand-child

2. **Limiter le nombre** (5-10 child pages max)
   - Au-delà, créer plusieurs pages parents

3. **Ordre logique**
   - Les child pages apparaissent dans l'ordre de création Notion
   - Utiliser des préfixes si besoin : "01 - Intro", "02 - Setup"

### Performance

- ✅ Les child pages sont synchronisées en parallèle avec le reste
- ✅ Pas d'impact significatif sur le temps de sync
- ✅ Cache individuel pour chaque page

---

## 🎉 Résultat final

Vous avez maintenant :
- ✅ **Child pages synchronisées** automatiquement
- ✅ **Sidebar de navigation** élégante
- ✅ **Layout app-like** pour documentation
- ✅ **URLs propres** et SEO-friendly
- ✅ **Navigation fluide** entre pages
- ✅ **Exactement comme Super/Potion** mais en mieux ! 🚀

---

**Des questions ou besoin d'aide ?**  
Cette fonctionnalité fonctionne exactement comme les database children, mais pour les pages imbriquées !

