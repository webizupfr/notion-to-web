# ⏱️ Résolution du problème de timeout de synchronisation

*Guide pour résoudre les erreurs `FUNCTION_INVOCATION_TIMEOUT`*

---

## 🎉 TL;DR - Solution appliquée

✅ **Sync sélectif activé** : Seules les pages modifiées sont synchronisées  
✅ **Parallélisation** : Child pages synchronisées par batch de 2  
✅ **Limite de sécurité** : Max 10 child pages par page  
✅ **Métriques** : Nouveau compteur `pagesSkipped`

**Résultat attendu :** 10-20x plus rapide ! Testez maintenant sans `force=1` :

```bash
# Sync normale (rapide, seulement les pages modifiées)
curl "https://votre-site.com/api/sync?secret=XXX"

# Force sync (lent, toutes les pages)
curl "https://votre-site.com/api/sync?secret=XXX&force=1"
```

---

## 🔴 Erreur rencontrée

```
An error occurred with your deployment
FUNCTION_INVOCATION_TIMEOUT
```

**Cause :** La fonction de synchronisation prend trop de temps (> timeout Vercel)

---

## 📊 Limites Vercel

| Plan | Timeout max |
|------|-------------|
| **Hobby** | 10 secondes |
| **Pro** | 60 secondes |
| **Enterprise** | 900 secondes (15 min) |

---

## ✅ Optimisations implémentées

### 1. Timeout augmenté à 60 secondes

**Fichier :** `src/app/api/sync/route.ts`

```typescript
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 secondes (Vercel Pro)
```

### 2. Parallélisation des child pages

**Avant :** Synchronisation en série (lent)
```typescript
for (const childPage of childPages) {
  await syncPage(childPage); // Attend chaque page
}
```

**Après :** Synchronisation par batch en parallèle (rapide)
```typescript
const CONCURRENCY = 2;
for (let i = 0; i < pages.length; i += CONCURRENCY) {
  const batch = pages.slice(i, i + CONCURRENCY);
  await Promise.allSettled(batch.map(page => syncPage(page)));
}
```

**Gain :** ~50% plus rapide

### 3. Limite du nombre de child pages

```typescript
const MAX_CHILD_PAGES = 10;
const pagesToSync = childPages.slice(0, MAX_CHILD_PAGES);
```

**Protection :** Évite les timeouts si trop de pages enfants

### 4. Pas de récursion infinie

```typescript
// Child pages ne synchronisent PAS leurs propres child pages
await syncPage(modifiedPage, { ...opts, force: false });
```

**Protection :** Évite les boucles infinies

---

## 🚀 Comment tester

### Test 1 : Sync avec peu de contenu

```bash
curl "https://votre-site.com/api/sync?secret=XXX&force=1"
```

**Attendu :** Succès en < 60s

### Test 2 : Vérifier la durée

Regarder les logs Vercel :
1. Aller sur vercel.com
2. Onglet "Functions"
3. Chercher `/api/sync`
4. Vérifier la durée d'exécution

**Bon :** < 30s  
**Limite :** 60s  
**Timeout :** > 60s

---

## ✅ Solution A : Sync sélectif (IMPLÉMENTÉ)

**Le sync sélectif est maintenant activé par défaut !**

Le système vérifie automatiquement si une page a été modifiée depuis la dernière synchronisation :

```typescript
// Ligne 260-265 de src/app/api/sync/route.ts
if (!opts.force && existing && existing.meta.lastEdited === metaInfo.lastEdited) {
  console.log(`[sync] ⏭️  Skipping "${slug}" - not modified since last sync`);
  opts.stats.pagesSkipped += 1;
  return existing.meta; // Skip sync
}
```

### Comment ça fonctionne

1. **Première sync** : Toutes les pages sont synchronisées
2. **Syncs suivantes** : Seules les pages modifiées sont re-synchronisées
3. **Force sync** : `?force=1` ignore cette logique et resync tout

### Avantages

✅ **10-20x plus rapide** pour les syncs régulières  
✅ **Pas de timeout** si peu de pages modifiées  
✅ **Moins d'appels API** Notion  
✅ **Économie de bande passante**

### Voir les pages skippées

Dans les logs :
```bash
[sync] ⏭️  Skipping "homepage" - not modified since last sync
[sync] ⏭️  Skipping "about" - not modified since last sync
[sync] 🔄 Syncing "blog/new-post" (new)
```

Dans les métriques :
```json
{
  "pagesProcessed": 10,
  "pagesSynced": 2,
  "pagesSkipped": 8  // ← Pages non modifiées
}
```

### Solution B : Désactiver child pages temporairement

Si vous avez trop de child pages :

```typescript
// Dans syncPage, commenter cette ligne :
// const syncedChildren = await syncChildPages(slug, page.id, blocks, opts);
```

**Résultat :** Pas de sidebar, mais pas de timeout

### Solution C : Sync en deux passes

**Passe 1 :** Synchroniser les pages principales
```bash
curl "https://votre-site.com/api/sync?secret=XXX"
```

**Passe 2 :** Synchroniser les child pages (manuellement si nécessaire)

### Solution D : Upgrade Vercel Pro

Si vous êtes en plan Hobby :
- Upgrade vers **Vercel Pro** (20$/mois)
- Timeout passe de 10s → **60s**
- Résout la plupart des timeouts

---

## 📊 Monitoring

### Métriques importantes

Après un sync, vérifier :

```json
{
  "durationMs": 45000,              // < 60000 = OK
  "pagesSynced": 7,
  "databaseChildrenSynced": 5,
  "childPagesSynced": 3             // Limité à 10
}
```

**Alertes :**
- `durationMs > 50000` → Proche du timeout
- `childPagesSynced = 10` → Limite atteinte, certaines pages non sync

### Logs à surveiller

```bash
[sync] Found 15 child pages in page "doc"
[sync] Too many child pages (15), limiting to 10
```

**Action :** Réduire le nombre de child pages ou créer plusieurs pages parentes

---

## 💡 Recommandations

### Pour éviter les timeouts

1. **Limiter le contenu par page**
   - Max 10 child pages par page parent
   - Pas de databases énormes (> 100 items)

2. **Organiser le contenu**
   ```
   ❌ Mauvais :
   📄 Documentation (50 child pages)
   
   ✅ Bon :
   📄 Documentation
      ├── 📄 Getting Started (5 child pages)
      ├── 📄 API Reference (8 child pages)
      └── 📄 Guides (6 child pages)
   ```

3. **Sync régulier**
   - Sync quotidien automatique (CRON)
   - Seules les pages modifiées sont re-synchronisées
   - Beaucoup plus rapide

4. **Force sync avec parcimonie**
   - `force=1` synchronise TOUT (lent)
   - Sans force, sync seulement les changements (rapide)

### Configuration optimale

```typescript
// src/app/api/sync/route.ts

// Augmenter si Vercel Pro
export const maxDuration = 60;

// Ajuster selon votre contenu
const MAX_CHILD_PAGES = 10;
const CONCURRENCY = 2;
```

---

## 🔄 Alternative : Sync asynchrone

Si les timeouts persistent, considérer une approche asynchrone :

### Option 1 : Vercel Cron Jobs

**Fichier :** `vercel.json`

```json
{
  "crons": [{
    "path": "/api/sync?secret=XXX",
    "schedule": "0 2 * * *"
  }]
}
```

**Avantage :** Sync automatique chaque jour à 2h du matin

### Option 2 : Background Jobs

Utiliser un service externe :
- **Upstash QStash** (queue de jobs)
- **Inngest** (workflow engine)
- **Trigger.dev** (background jobs)

**Avantage :** Pas de limite de temps

---

## ✅ Checklist de résolution

Suivre dans l'ordre :

- [x] **Augmenter maxDuration à 60s**
- [x] **Optimiser la parallélisation**
- [x] **Limiter les child pages à 10**
- [ ] **Tester le sync**
- [ ] **Vérifier les logs Vercel**
- [ ] **Ajuster CONCURRENCY si nécessaire**
- [ ] **Considérer Vercel Pro si Hobby**
- [ ] **Organiser le contenu si trop de pages**

---

## 📞 Debug avancé

### Voir exactement où ça timeout

Ajouter des logs temporaires :

```typescript
console.time('sync-total');
console.time('sync-pages');
// ... sync pages ...
console.timeEnd('sync-pages');

console.time('sync-child-pages');
// ... sync child pages ...
console.timeEnd('sync-child-pages');

console.timeEnd('sync-total');
```

**Résultat dans les logs :**
```
sync-pages: 15234ms
sync-child-pages: 32187ms
sync-total: 47421ms
```

**Action :** Si `sync-child-pages` est trop long, réduire MAX_CHILD_PAGES

---

## 🎯 Résultat attendu

Après optimisation :

```bash
curl "https://votre-site.com/api/sync?secret=XXX&force=1"

# Réponse en < 60s :
{
  "ok": true,
  "synced": 7,
  "posts": 12,
  "metrics": {
    "durationMs": 42000,  # < 60000 ✅
    "childPagesSynced": 8  # Limité à 10 ✅
  }
}
```

**Succès !** 🎉

---

**Le timeout devrait maintenant être résolu. Si le problème persiste, considérez Vercel Pro ou une organisation différente du contenu.**

