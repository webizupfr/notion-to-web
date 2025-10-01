# 🚦 Rate Limiting Notion API

**Guide pour gérer les limites de l'API Notion**

---

## 📊 Limites de Notion

### Taux de requêtes

| Type | Limite |
|------|--------|
| **Requêtes générales** | 3 par seconde |
| **Burst** | Jusqu'à 10 requêtes rapides |
| **Reset** | Toutes les 5-10 minutes |

### Actions qui comptent

Chaque appel à l'API Notion compte :
- ✅ `getPage()` - 1 requête
- ✅ `queryDatabase()` - 1 requête
- ✅ `getBlock()` - 1 requête
- ✅ `pageBlocksDeep()` - N requêtes (selon la profondeur)

**Exemple de sync complète :**
```
10 pages × 5 appels API par page = 50 requêtes
+ 5 child pages × 5 appels = 25 requêtes
= 75 requêtes total
```

À 3 req/s → **25 secondes minimum**

---

## 🔴 Symptômes du rate limit

### Erreur typique

```json
{
  "error": "Sync failed",
  "details": "You have been rate limited. Please try again in a few minutes."
}
```

### Dans les logs Notion

```
NotionClientError: Rate limited by the Notion API
code: rate_limited
status: 429
```

---

## ✅ Solutions

### Solution 1 : Attendre (RECOMMANDÉ)

**Le plus simple :** Attendez 5-10 minutes, puis re-sync **SANS force** :

```bash
# Sync normale (sync sélective, moins de requêtes)
curl "https://votre-site.com/api/sync/trigger?secret=XXX"
```

Avec la sync sélective, seules les pages modifiées sont synchronisées → beaucoup moins de requêtes.

### Solution 2 : Retry automatique (IMPLÉMENTÉ)

Le worker a maintenant un **système de retry automatique** :

```typescript
// Ligne 168-187 de worker/route.ts
while (attempt <= maxRetries) {
  try {
    result = await runFullSync(force);
    break;
  } catch (error) {
    if (errorMessage.includes('rate limit') && attempt < maxRetries) {
      attempt++;
      const waitTime = Math.pow(2, attempt) * 30000; // 30s, 60s, 120s
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
    throw error;
  }
}
```

**Comportement :**
1. Rate limit détecté
2. Attente de 30 secondes
3. Retry 1
4. Si rate limit encore → attente de 60 secondes
5. Retry 2
6. Si rate limit encore → attente de 120 secondes
7. Retry 3 ou échec

**Résultat :** La plupart des rate limits sont gérés automatiquement ! 🎉

### Solution 3 : Réduire la fréquence

Au lieu de faire des `force=1` fréquents :

```bash
# ❌ Mauvais (beaucoup de requêtes)
curl "...?force=1"  # Tout resync
curl "...?force=1"  # Tout resync encore
curl "...?force=1"  # Rate limit !

# ✅ Bon (sync sélective)
curl "..."          # Seulement ce qui a changé
# ... 1 heure plus tard ...
curl "..."          # Seulement ce qui a changé
```

**Force sync** → Seulement en cas de besoin (1x par semaine max)

---

## 🎯 Best Practices

### 1. Sync sélective par défaut

```bash
# Quotidienne (rapide, peu de requêtes)
curl "https://votre-site.com/api/sync/trigger?secret=XXX"
```

**Avantages :**
- ✅ 10-20x plus rapide
- ✅ 90% moins de requêtes API
- ✅ Pas de rate limit

### 2. Force sync occasionnelle

```bash
# Hebdomadaire (lent, beaucoup de requêtes)
curl "https://votre-site.com/api/sync/trigger?secret=XXX&force=1"
```

**Quand l'utiliser :**
- Première sync
- Après gros changement de structure
- En cas de problème de cache
- Maximum 1x par semaine

### 3. CRON intelligent

**`vercel.json`**
```json
{
  "crons": [
    {
      "path": "/api/sync/trigger?secret=XXX",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Pas de `force=1`** → Sync sélective chaque nuit !

### 4. Sync manuelle avec prudence

Si vous devez tester plusieurs fois :

```bash
# Test 1
curl "...?secret=XXX"
# ⏳ Attendre 1-2 minutes
# Test 2
curl "...?secret=XXX"
```

**Pas de sync en boucle !**

---

## 📊 Monitoring

### Vérifier le nombre de requêtes

Dans les logs Vercel/QStash, chercher :

```
[sync] summary {
  "durationMs": 45000,
  "pagesProcessed": 10,
  "pagesSynced": 2,        // Seulement 2 pages modifiées
  "pagesSkipped": 8,       // 8 pages skippées (pas de requêtes!)
  "childPagesSynced": 3
}
```

**Formule approximative :**
```
Requêtes ≈ (pagesSynced × 5) + (childPagesSynced × 5)
         = (2 × 5) + (3 × 5)
         = 25 requêtes
```

À 3 req/s → **8 secondes** (dans les limites ✅)

### Identifier les syncs problématiques

**Sync normale (bonne) :**
```
Duration: 15s
Pages synced: 3
Pages skipped: 10
Requêtes: ~15
```

**Sync force (risque de rate limit) :**
```
Duration: 120s
Pages synced: 13
Pages skipped: 0
Requêtes: ~65
```

---

## 🛠️ Configuration avancée

### Augmenter le délai de retry

**Fichier :** `src/app/api/sync/worker/route.ts`

```typescript
// Ligne 178
const waitTime = Math.pow(2, attempt) * 30000; // Changer ici

// Exemples :
// * 15000 → 15s, 30s, 60s (plus rapide, plus risqué)
// * 60000 → 60s, 120s, 240s (plus lent, plus sûr)
```

### Réduire le nombre de child pages

**Fichier :** `src/app/api/sync/route.ts`

```typescript
// Ligne 655
const MAX_CHILD_PAGES = 10; // Réduire à 5 si rate limit fréquent
```

Moins de child pages = moins de requêtes API = moins de rate limit.

---

## 🆘 Troubleshooting

### "Rate limited" même après attente

**Cause :** Plusieurs syncs en parallèle (CRON + manuel)

**Solution :**
1. Vérifier qu'il n'y a pas de CRON en cours
2. Attendre 15-20 minutes (reset complet)
3. Retry

### Rate limit sur sync normale (sans force)

**Cause :** Beaucoup de pages modifiées en même temps

**Solution :**
1. C'est temporaire, le retry automatique va gérer
2. Ou attendre 5 min et retry manuellement
3. Réduire `MAX_CHILD_PAGES` si ça arrive souvent

### Rate limit permanent

**Cause rare :** Problème avec votre intégration Notion

**Solution :**
1. Vérifier que vous n'avez pas plusieurs intégrations qui sync en même temps
2. Contacter le support Notion si ça persiste

---

## 📈 Optimisations futures

### 1. Batch par page

Au lieu de sync toutes les pages d'un coup, les sync par batch de 5 :

```typescript
// Pseudo-code
for (let i = 0; i < pages.length; i += 5) {
  const batch = pages.slice(i, i + 5);
  await syncBatch(batch);
  await sleep(2000); // 2s entre chaque batch
}
```

**Avantage :** Jamais de rate limit

### 2. Cache des RecordMaps

Mettre en cache les RecordMaps pour éviter de les re-fetch :

```typescript
const cachedRecordMap = await getFromCache(pageId);
if (cachedRecordMap) {
  return cachedRecordMap;
}
```

**Gain :** -30% de requêtes API

### 3. Webhook Notion

Utiliser les webhooks Notion (si disponibles) pour sync seulement quand il y a un changement.

---

## ✅ Résumé

**Pour éviter les rate limits :**

1. ✅ **Sync sélective par défaut** (sans `force=1`)
2. ✅ **Force sync occasionnelle** (1x par semaine max)
3. ✅ **Attendre entre les tests** (1-2 minutes minimum)
4. ✅ **Utiliser le retry automatique** (déjà implémenté)
5. ✅ **Monitoring** (vérifier les métriques)

**Si rate limit quand même :**

1. ⏳ **Attendre 5-10 minutes**
2. 🔄 **Retry sans force**
3. ✅ **Le retry automatique gère le reste**

---

**Le rate limit est normal et géré automatiquement. Pas de panique ! 😊**

