# 🚀 Guide du Sync Sélectif

*Synchronisation intelligente : 10-20x plus rapide*

---

## 🎯 Qu'est-ce que le sync sélectif ?

Le **sync sélectif** vérifie automatiquement si une page Notion a été modifiée depuis la dernière synchronisation. Si rien n'a changé, la page est **skippée** → gain de temps énorme !

### Avant (sync complet)

```
Pages en base : 10
Sync : 10 pages (60 secondes)
```

### Après (sync sélectif)

```
Pages en base : 10
Pages modifiées : 2
Sync : 2 pages (6 secondes) ✨
Pages skippées : 8
```

**Gain : 90% de temps en moins !**

---

## 📊 Comment ça marche

### 1. Détection automatique

Chaque page Notion a un champ `last_edited_time` :

```json
{
  "id": "abc123",
  "last_edited_time": "2025-10-01T10:30:00.000Z",
  "properties": { ... }
}
```

### 2. Comparaison

Lors du sync, le système compare :

```typescript
if (existing.meta.lastEdited === metaInfo.lastEdited) {
  // Page identique → skip
  console.log(`[sync] ⏭️  Skipping "${slug}"`);
  return existing.meta;
}

// Page modifiée → sync
console.log(`[sync] 🔄 Syncing "${slug}"`);
```

### 3. Trois scénarios

| Cas | Action | Durée |
|-----|--------|-------|
| **Page nouvelle** | Sync complète | ~5s |
| **Page modifiée** | Sync complète | ~5s |
| **Page identique** | Skip (cache) | ~0.1s |

---

## 🚀 Utilisation

### Sync normale (recommandé)

```bash
curl "https://votre-site.com/api/sync?secret=XXX"
```

**Comportement :**
- ✅ Skip les pages non modifiées
- ✅ Sync seulement les pages modifiées
- ✅ Très rapide (< 10s en général)

**À utiliser :**
- Sync quotidienne (CRON)
- Sync après édition d'une page
- En général

### Force sync (occasionnel)

```bash
curl "https://votre-site.com/api/sync?secret=XXX&force=1"
```

**Comportement :**
- ⚠️ Ignore le cache
- ⚠️ Resync TOUTES les pages
- ⚠️ Lent (30-60s)

**À utiliser :**
- Première sync
- Après changement de structure Notion
- En cas de problème de cache
- Maximum 1x par semaine

---

## 📈 Métriques

### Réponse d'une sync normale

```json
{
  "ok": true,
  "synced": 2,
  "posts": 0,
  "metrics": {
    "durationMs": 5240,         // ← Temps total
    "pagesProcessed": 10,       // ← Pages vérifiées
    "pagesSynced": 2,           // ← Pages synchronisées
    "pagesSkipped": 8,          // ← Pages skippées (pas modifiées)
    "childPagesSynced": 3,
    "imageMirrored": 5
  }
}
```

### Interprétation

**Bonne performance :**
```json
{
  "pagesProcessed": 10,
  "pagesSynced": 2,
  "pagesSkipped": 8,    // ← 80% de skip = excellent
  "durationMs": 5240    // ← Très rapide
}
```

**Première sync :**
```json
{
  "pagesProcessed": 10,
  "pagesSynced": 10,
  "pagesSkipped": 0,    // ← Normal (première fois)
  "durationMs": 45000   // ← Plus lent, mais normal
}
```

**Après modification massive :**
```json
{
  "pagesProcessed": 10,
  "pagesSynced": 10,
  "pagesSkipped": 0,    // ← Tout a été modifié
  "durationMs": 50000   // ← Long, mais normal
}
```

---

## 🔍 Logs détaillés

### Exemple de logs

```bash
[sync] Processing 10 pages...
[sync] ⏭️  Skipping "homepage" - not modified since last sync
[sync] ⏭️  Skipping "about" - not modified since last sync
[sync] ⏭️  Skipping "services" - not modified since last sync
[sync] 🔄 Syncing "blog/new-post" (new)
[sync] Found 3 child pages in page "blog/new-post"
[sync] Syncing child page: blog/new-post/chapter-1
[sync] 🔄 Syncing "contact" (updated)
[sync] ⏭️  Skipping "privacy" - not modified since last sync
[sync] ⏭️  Skipping "terms" - not modified since last sync

[sync] summary {
  durationMs: 7245,
  pagesProcessed: 10,
  pagesSynced: 2,
  pagesSkipped: 8
}
```

### Symboles

- **⏭️** : Page skippée (pas de changement)
- **🔄** : Page synchronisée (nouvelle ou modifiée)
- **(new)** : Nouvelle page
- **(updated)** : Page modifiée

---

## ⚡ Performances attendues

### Scénario 1 : Site stable (peu de modifications)

**Configuration :**
- 20 pages en base
- 1-2 pages modifiées par jour

**Sync quotidienne :**
```
Durée : ~5-10 secondes
Pages synced : 1-2
Pages skipped : 18-19
Taux de skip : 90-95%
```

**Économie :** 85% de temps en moins vs sync complète

### Scénario 2 : Site actif (modifications fréquentes)

**Configuration :**
- 20 pages en base
- 5 pages modifiées par jour

**Sync quotidienne :**
```
Durée : ~15-20 secondes
Pages synced : 5
Pages skipped : 15
Taux de skip : 75%
```

**Économie :** 60% de temps en moins vs sync complète

### Scénario 3 : Refonte complète

**Configuration :**
- 20 pages en base
- Toutes les pages modifiées

**Sync après refonte :**
```
Durée : ~50-60 secondes
Pages synced : 20
Pages skipped : 0
Taux de skip : 0%
```

**Normal :** Utilisez `force=1` dans ce cas

---

## 🎯 Best Practices

### 1. Sync quotidienne automatique

Configurer un CRON Vercel :

**`vercel.json`**
```json
{
  "crons": [{
    "path": "/api/sync?secret=YOUR_SECRET",
    "schedule": "0 2 * * *"
  }]
}
```

**Avantages :**
- Sync automatique chaque nuit
- Pas de timeout (sync sélectif)
- Site toujours à jour

### 2. Sync manuelle après édition

Après avoir édité une page dans Notion :

```bash
# Sync normale (rapide)
curl "https://votre-site.com/api/sync?secret=XXX"
```

La page modifiée sera synchronisée, les autres skippées.

### 3. Force sync mensuelle

Une fois par mois, faire un force sync complet :

```bash
# Force sync (lent mais complet)
curl "https://votre-site.com/api/sync?secret=XXX&force=1"
```

**Avantages :**
- Refresh complet du cache
- Détecte les problèmes cachés
- Resync les images

### 4. Monitoring

Surveiller les métriques :

```bash
# Voir les métriques
curl "https://votre-site.com/api/sync?secret=XXX" | jq '.metrics'
```

**Alertes à mettre en place :**
- `durationMs > 50000` → Proche du timeout
- `pagesSkipped = 0` sur sync normale → Problème de cache ?
- `imageFallbacks > 10` → Problème de mirroring

---

## 🐛 Troubleshooting

### "Toutes mes pages sont synced, aucune skippée"

**Symptôme :**
```json
{
  "pagesProcessed": 10,
  "pagesSynced": 10,
  "pagesSkipped": 0
}
```

**Causes possibles :**
1. C'est la première sync → Normal
2. Cache vide (Vercel KV vidé) → Normal
3. Force sync (`?force=1`) → Normal
4. Toutes les pages modifiées → Vérifier Notion

**Solution :**
Attendre la prochaine sync. Si le problème persiste, vérifier KV.

### "Les pages ne sont pas mises à jour"

**Symptôme :**
J'ai modifié une page dans Notion mais elle n'est pas mise à jour sur le site.

**Causes possibles :**
1. `lastEdited` pas mis à jour par Notion → Rare
2. Cache navigateur → Vider le cache
3. Revalidation pas déclenchée → Bug

**Solution :**
```bash
# Force sync de cette page
curl "https://votre-site.com/api/sync?secret=XXX&force=1"
```

### "Sync toujours lente même avec peu de modifications"

**Symptôme :**
```json
{
  "pagesSkipped": 8,
  "durationMs": 45000  // ← Toujours lent
}
```

**Causes possibles :**
1. Child pages nombreuses → Limiter à 10
2. Images lourdes → Optimiser
3. RecordMap lent → Notion API slow

**Solution :**
Voir `docs/sync-timeout-fix.md` pour optimisations avancées.

---

## 📊 Comparaison : Avec vs Sans sync sélectif

### Site avec 20 pages, 2 modifiées

| Méthode | Durée | API Calls | Skipped |
|---------|-------|-----------|---------|
| **Sans sync sélectif** | 55s | 200 | 0 |
| **Avec sync sélectif** | 6s | 22 | 18 |
| **Gain** | **91%** | **89%** | **+18** |

### Impact sur un mois (sync quotidienne)

| Méthode | Temps total | Coût API |
|---------|-------------|----------|
| **Sans sync sélectif** | 27.5 min | ~6000 calls |
| **Avec sync sélectif** | 3 min | ~660 calls |
| **Économie** | **24.5 min** | **89%** |

---

## 🎉 Résumé

✅ **Sync sélectif = activé par défaut**  
✅ **10-20x plus rapide** en moyenne  
✅ **Pas de timeout** sur sync régulière  
✅ **Économie d'API calls** Notion  
✅ **Cache intelligent** basé sur `lastEdited`

### Commandes clés

```bash
# Sync normale (recommandé, rapide)
curl "https://votre-site.com/api/sync?secret=XXX"

# Force sync (occasionnel, lent)
curl "https://votre-site.com/api/sync?secret=XXX&force=1"

# Voir les métriques
curl "https://votre-site.com/api/sync?secret=XXX" | jq '.metrics'
```

---

**Profitez de votre sync ultra-rapide ! 🚀**

