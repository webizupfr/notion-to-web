# 📋 Structure Notion attendue par l'app

Ce que l'agent doit créer dans Notion pour que le programme s'affiche correctement sur l'app Impulsion.

---

## 1. Page Programme (dans `NOTION_PROGRAMS_DB`)

Une page créée dans la DB Programs v3 avec ces propriétés :

### Propriétés obligatoires

| Property | Type | Valeur | Notes |
|---|---|---|---|
| `Title` | Title | Le titre du programme | Max 60 chars idéalement |
| `slug` | Rich Text | URL-safe kebab-case | ex: `challenge-ia-5j` |
| `type` | Select | `async` / `sync` / `event` | Détermine "Jour" vs "Module" vs "Session" |
| `visibility` | Select | `public` / `unlisted` / `private` | L'agent met `public` par défaut |
| `publishingStatus` | Select | **`draft`** | TOUJOURS `draft` à la création — tu valides avant publish |

### Propriétés recommandées

| Property | Type | Notes |
|---|---|---|
| `description` | Rich Text | 1-2 phrases courtes pour la card |
| `subtitle` | Rich Text | Promesse en 1 ligne |
| `target_audience` | Rich Text | "Pour qui c'est fait" — 2-3 lignes |
| `prerequisites` | Rich Text | Ce qu'il faut savoir avant (peut être vide) |
| `learning_outcomes` | Rich Text | "À la fin, tu sauras X" — 1 item par ligne |
| `estimated_duration_minutes` | Number | Durée totale du programme |
| `certificate_enabled` | Checkbox | true → l'apprenant peut télécharger un cert |

### Propriétés optionnelles (à toi de remplir manuellement après)

| Property | Type | Notes |
|---|---|---|
| `price` | Number | EUR. Vide = gratuit. Mets-le après la relecture. |
| `currency` | Select | `EUR` (default) |
| `password` | Rich Text | Si `visibility = private` |
| `cover` | Files | Image de cover (à mettre à la main pour l'instant) |
| `thumbnail` | Files | Vignette pour les cards |

> 🎨 **Tu rempliras `price`, `cover`, `thumbnail` manuellement après la génération auto.** Ce sont les seuls champs que l'agent ne peut pas générer (ou ne devrait pas).

---

## 2. Child pages = Units (Jours / Modules)

Sous la page programme, l'agent crée **N child_pages** (une par unit).

### Structure d'une child_page Unit

**Titre** : ex: `Jour 1 — Comprendre le fond` ou `Module 1 — Les bases`

**Contenu (1ers blocs)** :

```
[Callout ⚙️ avec emoji]
  [Bulleted list]
    • Durée : 45 min
    • Déverrouillage : J+0
    • Type : intro

[Heading 1 ou 2]   ← début du contenu pédagogique
[Paragraph]
...
```

### Format EXACT du callout ⚙️ Config (CRITIQUE)

Le parser de l'app (`src/lib/program-config.ts`) attend :

```yaml
Type de bloc : callout
Icon : ⚙️ (emoji exact, pas un autre engrenage Unicode)
Children : bulleted_list_item

Lignes acceptées (sans accents, casse insensible) :
  • Durée : 45 min          → durationMinutes = 45
  • Durée : 1h30            → durationMinutes = 90
  • Durée : 2 heures        → durationMinutes = 120
  • Déverrouillage : J+7    → unlockOffsetDays = 7
  • Déverrouillage : 7 jours → unlockOffsetDays = 7
  • Déverrouillage : 2026-05-15 → unlockAt = "2026-05-15"
  • Déverrouillage : immédiat → unlockOffsetDays = 0
  • Accès : gratuit | payant | aperçu  → accessTier
```

> ⚠️ **Le séparateur peut être `:` ou `=`** mais doit être présent. Pas de `–`.

### Steps = sub-child pages

Sous chaque unit, l'agent crée **N sub-child_pages** (une par step).

**Titre** : ex: `Étape 1 — Découvrir les cas d'usage`

**Contenu** :
```
[Callout ⚙️ avec emoji]
  [Bulleted list]
    • Type : intro | étape | conclusion | bonus
    • Durée : 15 min
    • Validation requise : oui | non    ← optionnel

[Heading 2 ou 3]
[Paragraph]
[Numbered list item]   ← pour les exercices
[Callout 💡]           ← pour les conseils
[Quote]                ← pour les anecdotes
[Code]                 ← pour les prompts
...
```

### Types de step reconnus

| Valeur dans Notion | Mappé à |
|---|---|
| `intro` ou `introduction` | `intro` |
| `étape` ou `etape` ou `step` | `step` |
| `conclusion` ou `fin` ou `end` | `conclusion` |
| `bonus` ou `option` ou `optionnel` | `option` |

---

## 3. Exemple complet (visualisation Notion)

```
📚 Challenge IA — 5 jours
   [Properties]
   - slug: challenge-ia-5j
   - type: async
   - visibility: public
   - publishingStatus: draft
   - description: 5 jours pour intégrer concrètement l'IA dans ton activité.
   - target_audience: Entrepreneurs, freelances, indépendants...
   - learning_outcomes:
     Maîtrise des prompts ChatGPT efficaces
     Application sur 5 cas d'usage métier concrets
     Plan d'action pour intégrer l'IA cette semaine
   
   📄 [Body content du programme — optionnel, pour l'intro globale]
   
   ↳ 📄 Jour 1 — Comprendre l'IA dans ton métier
        ⚙️ Config
        • Durée : 45 min
        • Déverrouillage : J+0
        
        ## Pourquoi ce jour ?
        ...
        
        ↳ 📄 Étape 1 — Identifier 3 cas d'usage
             ⚙️ Config
             • Type : intro
             • Durée : 10 min
             
             ## Avant de commencer
             ...
        
        ↳ 📄 Étape 2 — Tester ton premier prompt
             ⚙️ Config
             • Type : étape
             • Durée : 20 min
             ...
   
   ↳ 📄 Jour 2 — Écrire des prompts qui donnent des résultats
        ⚙️ Config
        • Durée : 45 min
        • Déverrouillage : J+1
        ...
   
   (etc. pour les autres jours)
```

---

## 4. Code n8n pour créer le callout ⚙️

Dans le node Notion `Append Block Children`, le body JSON ressemble à :

```json
{
  "children": [
    {
      "object": "block",
      "type": "callout",
      "callout": {
        "icon": { "type": "emoji", "emoji": "⚙️" },
        "color": "default",
        "rich_text": [
          { "type": "text", "text": { "content": "Configuration" } }
        ]
      }
    },
    {
      "object": "block",
      "type": "bulleted_list_item",
      "bulleted_list_item": {
        "rich_text": [
          { "type": "text", "text": { "content": "Durée : 45 min" } }
        ]
      }
    }
  ]
}
```

> ⚠️ Le **callout** doit être un block parent, et les **bulleted_list_item** doivent être en child_blocks. Sinon le parser ne les trouve pas.

Il y a 2 manières d'y arriver :
1. **Méthode A** (recommandée) : créer le callout + bullets séparément avec `append_block_children`. Les bullets sont posés "sous" le callout dans la chronologie → Notion les nest visuellement.
2. **Méthode B** (plus précise) : créer le callout avec `children` direct dans `callout` (mais l'API ne supporte pas toujours).

Dans le workflow n8n fourni, j'utilise la méthode A (suite de blocks).

---

## 5. Mapping JSON Claude → Blocks Notion

Le prompt 3 fait sortir Claude avec un format simplifié :

```json
{
  "type": "callout",
  "icon": "💡",
  "text": "..."
}
```

Le node n8n `Function` (qui suit le rédacteur) transforme ça en format API Notion :

```json
{
  "object": "block",
  "type": "callout",
  "callout": {
    "icon": { "type": "emoji", "emoji": "💡" },
    "rich_text": [
      { "type": "text", "text": { "content": "..." } }
    ]
  }
}
```

Le code de transformation est inclus dans le `workflow.json`. Il gère :
- `paragraph` / `heading_2` / `heading_3`
- `bulleted_list_item` / `numbered_list_item`
- `callout` (avec emoji)
- `quote`
- `code`
- `divider`

---

## 6. Validation

Après que l'agent ait créé le programme, vérifie ces points :

### ✅ Côté Notion
- [ ] La page programme apparaît dans DB Programs v3 avec status=draft
- [ ] Toutes les props sont remplies (sauf price, cover, thumbnail)
- [ ] Sous la page programme : N child_pages (= N units)
- [ ] Sous chaque unit : un callout ⚙️ avec durée + déverrouillage
- [ ] Sous chaque unit : M sub-child_pages (= M steps)
- [ ] Sous chaque step : un callout ⚙️ avec type + durée

### ✅ Côté app
- [ ] Sync : `/admin/programs` → click "🔄 Synchroniser Notion"
- [ ] Le programme apparaît dans la liste
- [ ] Click "Voir ↗" → la page `/programs/<slug>` se charge
- [ ] La sidebar liste bien tous les jours/modules
- [ ] Click sur un jour → page unit avec contenu et steps

### Si ça plante
- "Programme not found" → sync n'a pas marché. Vérifie que la DB est partagée avec ton intégration.
- Sidebar vide → les child_pages ne sont peut-être pas reconnus. Vérifie les callouts ⚙️.
- Step content vide → vérifie que le contenu rédigé par Claude a bien été inséré dans la sub-child_page (utilise Drizzle Studio ou lis la page Notion directement).

---

## 7. Bonus : permissions Notion

Pour que ton intégration n8n puisse créer des pages :

1. Notion → Settings → Connections → ton intégration "Impulsion sync"
2. Onglet **Capabilities** : `Read`, `Insert`, `Update` (pas besoin de delete)
3. **Pages access** : ajoute la DB Programs v3

Sans ces permissions, n8n recevra `"object_not_found"` ou `"permission_denied"`.
