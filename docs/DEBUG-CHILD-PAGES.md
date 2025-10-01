# 🔍 Debug : Child Pages non affichées

## 📋 Checklist de vérification

### 1. Vérifier que la sync est terminée

```bash
# Attendre 1-2 minutes, puis vérifier dans le dashboard
open https://console.upstash.com/qstash
```

**Statut attendu :** "Delivered" (vert)

### 2. Vérifier la structure dans Notion

Dans votre page Notion (celle qui devrait avoir la sidebar) :

✅ **La page a `Full width` activé ?**
- Cliquer sur les 3 points en haut à droite
- Vérifier que "Full width" est coché

✅ **La page contient des child pages ?**
- Dans la page, vous devez avoir des pages imbriquées
- Elles apparaissent comme des sous-pages dans Notion

**Exemple de structure correcte dans Notion :**

```
📄 Documentation (full-width activé)
   ├── 📄 Getting Started
   ├── 📄 Using Aether  
   └── 📄 Blocks
```

**Structure incorrecte (ne fonctionnera pas) :**

```
📄 Documentation (full-width activé)
   [Contenu texte]
   [Pas de child pages]
```

### 3. Vérifier que les child pages sont synchronisées

Après la sync, vérifier les URLs :

```bash
# Tester l'URL de la page parent
curl -I https://www.impulsion-ia.fr/documentation

# Tester les URLs des child pages (elles doivent exister)
curl -I https://www.impulsion-ia.fr/documentation/getting-started
curl -I https://www.impulsion-ia.fr/documentation/using-aether
curl -I https://www.impulsion-ia.fr/documentation/blocks
```

**Attendu :** Status `200 OK` pour toutes les URLs

**Si 404 :** Les child pages ne sont pas synchronisées

### 4. Vérifier les métadonnées de la page

Dans Notion, vérifier que votre page parent a bien :

| Propriété | Valeur |
|-----------|--------|
| **slug** | `documentation` (ou autre) |
| **Title** | Titre de votre page |
| **Full width** | ✅ Activé dans les paramètres de page |

### 5. Vérifier les logs de sync

```bash
# Voir les logs Vercel
open https://vercel.com/votre-projet
```

Chercher dans les logs :
```
[sync] Found X child pages in page "documentation"
[sync] Syncing child page: documentation/getting-started
```

**Si vous ne voyez pas ces logs :** Les child pages ne sont pas détectées

---

## 🐛 Problèmes courants

### Problème 1 : "Pas de child pages détectées"

**Symptôme :** Logs montrent `Found 0 child pages`

**Causes possibles :**
1. Vous n'avez pas de pages imbriquées dans Notion
2. Les pages sont des liens (🔗) et non des child pages (📄)
3. Les pages sont dans une database (différent de child pages)

**Solution :**
Dans Notion, créer des vraies child pages :
1. Ouvrir votre page parent
2. Taper `/page` ou cliquer sur "+" 
3. Sélectionner "Page"
4. Créer la page (elle devient une child page)

**Différence importante :**

✅ **Child page (fonctionne) :**
```
📄 Documentation
   ├── 📄 Page enfant 1 ← Créée avec /page
   └── 📄 Page enfant 2 ← Créée avec /page
```

❌ **Lien vers page (ne fonctionne pas) :**
```
📄 Documentation
   └── 🔗 Lien vers une autre page ← Juste un lien
```

❌ **Database (ne fonctionne pas) :**
```
📄 Documentation
   └── 📊 Database de pages ← Database, pas child pages
```

### Problème 2 : "Child pages synchronisées mais sidebar ne s'affiche pas"

**Symptôme :** URLs des child pages fonctionnent, mais pas de sidebar

**Vérification :**
```bash
# Inspecter la page dans le navigateur
# Ouvrir les DevTools (F12)
# Console → taper :
console.log(document.querySelector('.page-sidebar'))
```

**Si `null` :** La sidebar n'est pas rendue

**Causes possibles :**
1. `full_width` pas détecté par le système
2. `childPages` pas dans les métadonnées

**Solution :** Vérifier dans les logs Vercel que la page est bien détectée comme full-width

### Problème 3 : "Timeout lors de la sync"

**Symptôme :** La sync ne se termine jamais

**Solution :**
C'est pour ça qu'on a mis QStash ! Vérifier le dashboard :
```bash
open https://console.upstash.com/qstash
```

Si le job est en "Failed", cliquer dessus pour voir l'erreur.

---

## 🧪 Test de la fonctionnalité

### Test complet étape par étape

#### 1. Créer une page de test dans Notion

1. Dans votre database "Pages", créer une nouvelle page :
   - **Title :** Test Documentation
   - **slug :** test-doc
   - **Full width :** Activer dans les paramètres de page (3 points → Full width)

2. Dans cette page, créer 3 child pages :
   - Taper `/page` → "Getting Started"
   - Taper `/page` → "Using Aether"
   - Taper `/page` → "Blocks"

**Résultat dans Notion :**
```
📄 Test Documentation (full-width)
   ├── 📄 Getting Started
   ├── 📄 Using Aether
   └── 📄 Blocks
```

#### 2. Synchroniser

```bash
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=XXX&force=1"
```

Attendre 1-2 minutes.

#### 3. Vérifier dans le dashboard QStash

```bash
open https://console.upstash.com/qstash
```

Statut : "Delivered" (vert) ✅

#### 4. Tester les URLs

```bash
# Page parent
open https://www.impulsion-ia.fr/test-doc

# Child pages
open https://www.impulsion-ia.fr/test-doc/getting-started
open https://www.impulsion-ia.fr/test-doc/using-aether
open https://www.impulsion-ia.fr/test-doc/blocks
```

#### 5. Vérifier la sidebar

Sur `https://www.impulsion-ia.fr/test-doc`, vous devriez voir :

```
┌──────────────────────────────────────────┐
│ ┌──────────┐  ┌───────────────────────┐ │
│ │          │  │                       │ │
│ │ Sidebar  │  │   Contenu principal   │ │
│ │          │  │                       │ │
│ │ • Getting│  │                       │ │
│ │   Started│  │                       │ │
│ │          │  │                       │ │
│ │ • Using  │  │                       │ │
│ │   Aether │  │                       │ │
│ │          │  │                       │ │
│ │ • Blocks │  │                       │ │
│ │          │  │                       │ │
│ └──────────┘  └───────────────────────┘ │
└──────────────────────────────────────────┘
```

---

## 🔧 Si ça ne marche toujours pas

### Debug avancé

1. **Vérifier les métadonnées de la page**

Créer un endpoint de debug temporaire :

**Fichier : `src/app/api/debug/[slug]/route.ts`**

```typescript
import { getPageBundle } from '@/lib/content-store';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  const bundle = await getPageBundle(params.slug);
  
  return NextResponse.json({
    meta: bundle?.meta,
    hasChildPages: !!bundle?.meta.childPages?.length,
    childPages: bundle?.meta.childPages || [],
    fullWidth: bundle?.meta.fullWidth,
  });
}
```

Puis tester :
```bash
curl https://www.impulsion-ia.fr/api/debug/test-doc | jq '.'
```

**Résultat attendu :**
```json
{
  "meta": {
    "slug": "test-doc",
    "title": "Test Documentation",
    "fullWidth": true,
    "childPages": [
      {
        "id": "xxx",
        "title": "Getting Started",
        "slug": "test-doc/getting-started"
      },
      {
        "id": "yyy",
        "title": "Using Aether",
        "slug": "test-doc/using-aether"
      },
      {
        "id": "zzz",
        "title": "Blocks",
        "slug": "test-doc/blocks"
      }
    ]
  },
  "hasChildPages": true,
  "fullWidth": true
}
```

2. **Si `fullWidth: false`**

Le problème est que Notion ne retourne pas la propriété `full_width`.

**Solution :** Vérifier que vous avez bien activé "Full width" dans les paramètres de la page Notion (pas une propriété de database, mais un paramètre de page).

3. **Si `childPages: []`**

Les child pages ne sont pas détectées.

**Solution :** Vérifier que vous avez bien des **child pages** (📄) et pas des liens ou des databases.

---

## 📞 Besoin d'aide ?

**Envoyez-moi :**
1. Le slug de votre page
2. Un screenshot de la structure dans Notion
3. Les logs de sync (depuis Vercel ou QStash dashboard)
4. Le résultat de l'endpoint de debug

**Je pourrai alors identifier le problème exact ! 🕵️**

