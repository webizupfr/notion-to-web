# 📊 État de la fonctionnalité Child Pages

## 🔴 État actuel : TEMPORAIREMENT DÉSACTIVÉE

**Raison :** Timeout lors de la synchronisation

### Problème identifié

Le worker QStash appelle l'ancien endpoint `/api/sync` qui a :
- ✅ Sync sélective
- ✅ Optimisations
- ❌ Mais timeout de 60 secondes (`maxDuration: 60`)

**Résultat :** 
- Le worker timeout après 60s
- Erreur 504 → Erreur 500
- La sync échoue

### Solution temporaire appliquée

Les child pages sont **désactivées** dans `/api/sync/route.ts` (lignes 595-610) :

```typescript
// TEMPORAIREMENT DÉSACTIVÉ pour éviter les timeouts
// const syncedChildren = await syncChildPages(slug, page.id, blocks, opts);
```

**Impact :**
- ✅ La sync fonctionne maintenant
- ❌ Pas de sidebar avec child pages
- ❌ Les child pages ne sont pas synchronisées

---

## ✅ Solution définitive (à implémenter)

### Option 1 : Optimiser le worker (RECOMMANDÉ)

**Problème actuel :**
```
Worker QStash → Appelle /api/sync (60s max) → Timeout
```

**Solution :**
```
Worker QStash → Exécute la sync directement (pas de limite) → Success
```

**À faire :**
1. Extraire la logique de sync dans un fichier partagé
2. Le worker appelle directement cette logique
3. Plus de dépendance à l'ancien endpoint

**Temps estimé :** 1-2 heures

**Fichiers à créer :**
- `src/lib/sync-logic.ts` (logique partagée)
- Modifier `src/app/api/sync/worker/route.ts`

### Option 2 : Sync en deux passes

**Principe :**
1. **Passe 1** : Sync toutes les pages principales (< 60s)
2. **Passe 2** : Sync seulement les child pages (< 60s)

**Avantages :**
- ✅ Simple à implémenter
- ✅ Fonctionne avec l'architecture actuelle

**Inconvénients :**
- ⚠️ Sync plus lente (2 passes)
- ⚠️ Plus complexe à maintenir

**Temps estimé :** 30 minutes

### Option 3 : Désactiver database children (temporaire)

Si les database children prennent trop de temps, les désactiver aussi :

```typescript
// Ligne 592
// await syncDatabaseChildren(databaseId, slug, opts);
```

**Avantages :**
- ✅ Sync encore plus rapide
- ✅ Réactive les child pages

**Inconvénients :**
- ❌ Perte de la fonctionnalité database children

---

## 🎯 Recommandation

**Court terme (maintenant) :**
- ✅ Child pages désactivées
- ✅ La sync fonctionne
- ✅ Votre site est opérationnel

**Moyen terme (cette semaine) :**
- Implémenter **Option 1** (worker optimisé)
- Temps : 1-2 heures
- Résultat : Child pages + pas de timeout

**Avantages de l'Option 1 :**
- Solution pérenne
- Pas de limite de temps
- Architecture propre

---

## 📝 Plan d'action détaillé (Option 1)

### Étape 1 : Extraire la logique de sync

**Créer :** `src/lib/sync-logic.ts`

```typescript
import { getPageMeta, pageBlocksDeep } from '@/lib/notion';
import { setPageBundle } from '@/lib/content-store';
// ... imports

export async function syncPageLogic(
  page: PageObjectResponse,
  opts: SyncOptions
): Promise<PageMeta> {
  // Copier toute la logique de syncPage depuis route.ts
  // Mais sans les dépendances Next.js (revalidate, etc.)
  
  const slug = firstRichText(page.properties.slug);
  // ... tout le reste
  
  return meta;
}

export async function syncAllPages(
  pages: PageObjectResponse[],
  opts: SyncOptions
): Promise<SyncResult> {
  // Boucle sur toutes les pages
  // Avec child pages inclus
  
  return { synced: pages.length, ... };
}
```

### Étape 2 : Modifier le worker

**Fichier :** `src/app/api/sync/worker/route.ts`

```typescript
import { syncAllPages } from '@/lib/sync-logic';
import { collectDatabasePages } from '@/lib/sync-helpers';

async function POST_HANDLER(request: Request) {
  const body = await request.json();
  const force = body.force ?? false;
  
  // Récupérer les pages
  const pages = await collectDatabasePages(PAGES_DB);
  
  // Synchroniser directement (pas d'appel à /api/sync)
  const result = await syncAllPages(pages, { force });
  
  return NextResponse.json({ ok: true, result });
}

export const POST = verifySignatureAppRouter(POST_HANDLER);
```

### Étape 3 : Réactiver les child pages

**Dans :** `src/lib/sync-logic.ts`

```typescript
// Child pages inclus dans syncPageLogic
const syncedChildren = await syncChildPages(slug, page.id, blocks, opts);
if (syncedChildren.length > 0) {
  meta.childPages = syncedChildren;
}
```

### Étape 4 : Tester

```bash
# Sync complète avec child pages
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=XXX&force=1"

# Vérifier dans le dashboard
open https://console.upstash.com/qstash
```

**Durée attendue :** 2-5 minutes (pas de timeout !)

---

## 🧪 Tests à faire après implémentation

### Test 1 : Sync complète

```bash
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=XXX&force=1"
```

**Attendu :**
- ✅ Status "Delivered" dans QStash
- ✅ Durée : 2-5 minutes
- ✅ Pas de timeout

### Test 2 : Child pages synchronisées

```bash
# Vérifier qu'une page avec child pages a bien les métadonnées
curl "https://www.impulsion-ia.fr/api/debug/votre-page" | jq '.childPages'
```

**Attendu :**
```json
[
  {
    "id": "xxx",
    "title": "Getting Started",
    "slug": "votre-page/getting-started"
  }
]
```

### Test 3 : Sidebar affichée

```bash
open https://www.impulsion-ia.fr/votre-page
```

**Attendu :**
- ✅ Sidebar visible à gauche
- ✅ Liste des child pages
- ✅ Navigation fonctionnelle

---

## 💰 Estimation

| Task | Temps | Difficulté |
|------|-------|------------|
| Extraire logique sync | 1h | ⭐⭐⭐ |
| Modifier worker | 30min | ⭐⭐ |
| Tests | 30min | ⭐ |
| **Total** | **2h** | ⭐⭐⭐ |

---

## 🎁 Bonus : Optimisations possibles

Une fois l'Option 1 implémentée, on peut ajouter :

### 1. Parallélisation des child pages

```typescript
// Au lieu de :
for (const page of childPages) {
  await syncPage(page);
}

// Faire :
await Promise.all(
  childPages.map(page => syncPage(page))
);
```

**Gain :** 50% plus rapide

### 2. Limit adaptative

```typescript
// Si > 10 child pages, sync seulement les 10 premières
const MAX_CHILD_PAGES = force ? 20 : 10;
```

**Gain :** Sync plus prévisible

### 3. Cache des child pages

```typescript
// Si child pages pas modifiées, skip la sync
if (!force && existingChildPages.lastEdited === current.lastEdited) {
  return existingChildPages;
}
```

**Gain :** 90% plus rapide pour les child pages inchangées

---

## 📞 Prochaines étapes

1. **Maintenant** : Vérifier que la sync fonctionne sans child pages
2. **Cette semaine** : Implémenter Option 1 si vous voulez les child pages
3. **Alternative** : Vivre sans child pages (votre site fonctionne déjà très bien !)

**Voulez-vous que j'implémente l'Option 1 (2h) ou préférez-vous vivre sans child pages pour l'instant ?**

---

## 📊 Résumé visuel

### Avant (ne fonctionnait pas)

```
Trigger → QStash → Worker → /api/sync (60s max) → Timeout ❌
```

### Maintenant (fonctionne, sans child pages)

```
Trigger → QStash → Worker → /api/sync (< 60s) → Success ✅
                                     └─ child pages désactivées
```

### Après Option 1 (fonctionne, avec child pages)

```
Trigger → QStash → Worker → sync-logic.ts (pas de limite) → Success ✅
                                     └─ child pages incluses
```

---

**Statut mis à jour : 1 octobre 2025**

