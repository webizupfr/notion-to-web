# 🎯 Synchronisation des pages enfants des databases

## 📋 Problème résolu

### Avant
- Une page "sprint" contient une database avec des items
- Chaque item a un slug comme `/sprint/cas-client-adecco`
- Les liens dans la database pointaient vers ces slugs
- **Mais** les pages enfants n'étaient jamais synchronisées → **404 erreur**

### Après
- L'API `/api/sync` détecte maintenant les databases dans chaque page
- Pour chaque database, elle synchronise **toutes les pages enfants** individuellement
- Chaque page enfant est accessible à son URL (ex: `/sprint/cas-client-adecco`)
- Les liens dans les collections fonctionnent correctement ✅

---

## 🔧 Modifications techniques

### 1. API de synchronisation (`src/app/api/sync/route.ts`)

#### Nouvelle fonction `syncDatabaseChildren`
Cette fonction est appelée automatiquement après la synchronisation d'une page qui contient une database.

**Logique :**
```typescript
// Pour chaque page qui contient une database
1. Récupérer toutes les pages de la database
2. Pour chaque page enfant :
   - Extraire le slug (ex: "cas-client-adecco")
   - Construire le slug complet (ex: "sprint/cas-client-adecco")
   - Synchroniser la page comme une page normale
   - Enregistrer dans le cache
```

**Gestion intelligente des slugs :**
- Si le slug commence par `/` : on l'utilise tel quel (ex: `/sprint/cas-client`)
- Si le slug contient déjà le chemin : on l'utilise (ex: `sprint/cas-client`)
- Sinon, on combine avec le parent (ex: `sprint` + `cas-client` = `sprint/cas-client`)

#### Nouvelles métriques
- `databaseChildrenSynced` : nombre de pages enfants synchronisées
- Visible dans la réponse de l'API sync

### 2. Composant Blocks (`src/components/notion/Blocks.tsx`)

#### Nouveau paramètre `currentSlug`
Le composant `Blocks` accepte maintenant un paramètre `currentSlug` qui est propagé à tous les blocs, notamment les collections.

**Changements :**
```tsx
// Avant
<Blocks blocks={blocks} />

// Après
<Blocks blocks={blocks} currentSlug={slug} />
```

**Propagation du slug :**
- Le slug est passé à `renderBlockAsync`
- Qui le passe à `renderCollectionBlock`
- Qui le passe à `NotionCollectionView` comme `basePath`
- Qui l'utilise pour construire les liens des items

### 3. Pages (`src/app/(site)/[...slug]/page.tsx` et `src/app/(site)/blog/[slug]/page.tsx`)

Les pages passent maintenant leur slug au composant `Blocks` :

```tsx
// Page normale
<Blocks blocks={blocks} currentSlug={slug} />

// Page de blog
<Blocks blocks={blocks} currentSlug={`blog/${slug}`} />
```

---

## 🧪 Comment tester

### 1. Lancer une synchronisation complète

```bash
curl "https://www.impulsion-ia.fr/api/sync?secret=VOTRE_SECRET&force=1"
```

**Ce que vous devriez voir dans les logs :**
```
[sync] Found 5 children in database 2737fdb7-... for parent "sprint"
[sync] Syncing database child: sprint/cas-client-adecco (page 2737fdb7-...)
[sync] Syncing database child: sprint/autre-cas (page 2737fdb7-...)
...
```

**Réponse attendue :**
```json
{
  "ok": true,
  "synced": 7,
  "posts": 12,
  "metrics": {
    ...
    "databaseChildrenSynced": 5,
    ...
  }
}
```

### 2. Vérifier qu'une page enfant est accessible

```bash
# Tester une page enfant de database
curl -I "https://www.impulsion-ia.fr/sprint/cas-client-adecco"
# Devrait retourner 200 OK (au lieu de 404)
```

### 3. Vérifier les liens dans la database

1. Allez sur `https://www.impulsion-ia.fr/sprint`
2. Cliquez sur un item de la database (ex: "The Adecco Group")
3. Vous devriez arriver sur `/sprint/cas-client-adecco` **sans erreur 404**
4. La page devrait afficher tout le contenu de la page Notion

---

## 🎓 Architecture inspirée de Super et Potion

Cette solution s'inspire des systèmes utilisés par **Super** et **Potion** :

### Super
- Chaque item d'une database est une vraie page Notion avec son propre contenu
- Super synchronise ces pages individuellement
- Les collections affichent des liens vers ces pages

### Potion  
- Même approche : database = index, items = pages complètes
- Système de routing dynamique basé sur les slugs
- Cache intelligent pour les performances

### Notre implémentation
- ✅ Synchronisation automatique des pages enfants
- ✅ Construction intelligente des slugs (relatifs ou absolus)
- ✅ Cache avec Vercel KV pour performances
- ✅ Propagation du contexte (slug parent) aux collections
- ✅ Métriques de suivi

---

## 📊 Exemple concret

### Structure Notion
```
📄 Page "sprint" (slug: "sprint")
   └── 🗄️ Database "Cas clients"
       ├── 📄 The Adecco Group (slug: "/sprint/cas-client-adecco")
       ├── 📄 Autre cas (slug: "/sprint/autre-cas")
       └── 📄 Etc.
```

### URLs générées
```
✅ /sprint                    → Page principale
✅ /sprint/cas-client-adecco  → Page enfant (database item)
✅ /sprint/autre-cas          → Page enfant (database item)
```

### Flux de données

1. **Sync initial :**
   ```
   syncPage("sprint")
     → Détecte database
     → syncDatabaseChildren()
       → Sync "sprint/cas-client-adecco"
       → Sync "sprint/autre-cas"
   ```

2. **Rendu de /sprint :**
   ```
   Page sprint
     → Blocks (currentSlug="sprint")
       → NotionCollectionView (basePath="/sprint")
         → Liens: /sprint/cas-client-adecco
   ```

3. **Rendu de /sprint/cas-client-adecco :**
   ```
   Page [...slug] avec slug=["sprint", "cas-client-adecco"]
     → Charge le bundle "sprint/cas-client-adecco"
     → Affiche le contenu complet
   ```

---

## 🚀 Prochaines étapes

1. ✅ **Tester la synchronisation** avec votre API
2. ✅ **Vérifier les logs** pour voir les pages enfants synchronisées
3. ✅ **Tester la navigation** depuis la page sprint vers les pages enfants
4. 🔄 **Optionnel** : Ajouter une option pour désactiver la sync des enfants si besoin
5. 🔄 **Optionnel** : Ajouter un cache TTL différent pour les pages enfants

---

## 💡 Notes importantes

### Performance
- La synchronisation des enfants se fait **en série** pour éviter de surcharger l'API Notion
- Chaque page enfant a son propre cache dans Vercel KV
- Le `revalidate` de 60 secondes s'applique à toutes les pages

### Slug flexible
Le système gère 3 formats de slug dans la database :
1. **Absolu** : `/sprint/cas-client` → devient `sprint/cas-client`
2. **Avec chemin** : `sprint/cas-client` → utilisé tel quel
3. **Relatif** : `cas-client` → devient `sprint/cas-client`

### Erreurs gérées
- Si une page enfant n'a pas de slug → skip avec warning
- Si la database n'est pas accessible → skip avec warning
- Si une page enfant échoue → continue avec les autres

---

## 🐛 Debugging

### Les pages enfants ne sont pas synchronisées ?

Vérifiez les logs de l'API :
```bash
# Dans Vercel logs ou terminal local
[sync] Found 0 children in database...
```

**Causes possibles :**
- La database n'a pas de propriété "slug"
- Les pages de la database sont archivées
- L'intégration n'a pas accès à la database

### Les liens ne fonctionnent pas ?

Vérifiez que :
1. Le `currentSlug` est bien passé au composant `Blocks`
2. Le `basePath` est correctement construit dans `NotionCollectionView`
3. Les slugs dans la database correspondent aux pages synchronisées

### 404 encore présent ?

```bash
# Vérifier si la page est dans le cache
curl "https://www.impulsion-ia.fr/api/page?slug=sprint/cas-client-adecco"

# Si vide, forcer un re-sync
curl "https://www.impulsion-ia.fr/api/sync?secret=VOTRE_SECRET&force=1"
```

---

## ✅ Checklist finale

- [x] API sync modifiée avec `syncDatabaseChildren`
- [x] Métriques ajoutées (`databaseChildrenSynced`)
- [x] Composant `Blocks` accepte `currentSlug`
- [x] Pages mettent à jour pour passer le slug
- [x] Propagation récursive du slug dans tous les blocs
- [x] Pas d'erreur de linting
- [ ] Tests avec votre database réelle
- [ ] Vérification des logs
- [ ] Navigation testée


