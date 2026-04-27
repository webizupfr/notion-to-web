# NOTION — Champs à remplir côté toi

> Après la migration Tier 0 + Tier 1 faite via MCP le 23/04/2026, voici **ce qui reste à remplir manuellement** dans Notion. Le code côté Next.js lira ces valeurs après prochaine sync.

---

## 🎯 Priorité globale

Par ordre d'impact sur l'UX / SEO / vente :

| Rang | Champ | Pourquoi |
|---|---|---|
| 1 | `publishing_status` | Aujourd'hui tout est vide = invisible. Rien ne s'affiche tant que tu n'as pas mis `published`. |
| 2 | `cover_image` (hubs) | OG image + cards index = 1re impression prospect |
| 3 | `instructors` relation | Schema.org Course obligatoire + certificats |
| 4 | `target_audience` + `prerequisites` + `learning_outcomes` | Sections pages hub, SEO Course rich snippet |
| 5 | `estimated_duration_minutes` | Schema.org `timeRequired` |
| 6 | Cohortes `capacity` + `enrollment_deadline` + `enrollment_url` | Affichage "Plus que X places" + CTA s'inscrire |
| 7 | `certificate_enabled` | Active la feature certificat post Sprint 4 |
| 8 | `thumbnail` (hubs/sprints) | Cards listes |

---

## 1. DB Instructors — à peupler en premier

**Créer 1 ligne par instructeur** (toi et tes assistants/guests). Champs :

| Champ | Exemple |
|---|---|
| `Name` | Arthur Maréchaux |
| `bio` | 2-3 phrases. "Fondateur d'Impulsion. Ex-X, ex-Y. Accompagne les apprenants sur X." |
| `photo` | Upload 1 photo portrait 500×500 carré |
| `email` | arthur@impulsion.studio |
| `linkedin` | https://linkedin.com/in/arthurmarechaux |
| `role` | `lead` |

→ **URL de la DB** : cherche "DB Instructors" dans ta page "Espaces Impulsion" à la racine.

---

## 2. DB Hubs — 8 hubs à compléter

### Checklist par hub

Pour CHAQUE hub, remplis :

- [ ] `publishing_status` → `published` (ou `draft` si pas prêt, `archived` si retiré)
- [ ] `cover_image` → 1 fichier 1600×900 ou 1200×630 (OG)
- [ ] `thumbnail` → 1 fichier 400×300 pour cards listes
- [ ] `instructors` → relation vers la/les ligne(s) DB Instructors
- [ ] `estimated_duration_minutes` → ex: 1800 (pour 30h)
- [ ] `target_audience` → "Pour qui ce hub est fait" (2-3 lignes)
- [ ] `prerequisites` → "Ce qu'il faut savoir avant" (liste à puces ok)
- [ ] `learning_outcomes` → "À la fin tu sais X, Y, Z" (liste à puces)
- [ ] `certificate_enabled` → coché si tu veux émettre un certificat post-cours

### Liste des 8 hubs

| Hub | Slug | Notes |
|---|---|---|
| **Le Challenge** | `challenge` | Hub phare — à prioriser |
| **Le Programme** | `programme` | Hub phare — à prioriser |
| **30 Jours Chrono** | `30jc` | — |
| **21 Jours Chrono** | `test30` | ⚠️ slug incohérent (21j mais slug test30) — à fix |
| **Assistant IA** | `assistant-ia` | — |
| **Agent de veille** | `lab/agent-veille` | ⚠️ slug contient `/` — risque de conflit routing, à envisager renommer en `agent-veille` |
| **Design** | `design` | ⚠️ conflit slug avec Sprint Design (cf. plus bas) |
| **Challebfe** | `challenge-5j` | ⚠️ typo ds le title — renommer "Challenge 5 jours" ? |

### Template de contenu prêt à copier

Pour les 8 hubs, voici des templates génériques que tu peux adapter :

```
target_audience:
Entrepreneurs ou intrapreneurs qui veulent [objectif], sans formation académique préalable.
Temps disponible : 30 min/jour minimum.

prerequisites:
- Maîtriser les bases de [X]
- Avoir accès à [outil]
- Volonté de produire un livrable chaque jour

learning_outcomes:
À la fin de ce hub, tu sauras :
- [Capacité 1]
- [Capacité 2]
- [Capacité 3]
- [Livrable concret produit]
```

---

## 3. DB Sprints — 4 sprints à compléter

### Checklist par sprint

Pour CHAQUE sprint :

- [ ] `publishing_status` → `published` / `draft` / `archived`
- [ ] `cover_image` → 1600×900
- [ ] `thumbnail` → 400×300
- [ ] `instructors` → relation DB Instructors (qui anime ce sprint)
- [ ] `estimated_duration_minutes` → somme des modules (ex: 2880 pour 48h total)
- [ ] `capacity` → nb max participants (ex: 25)

### Liste des 4 sprints

| Sprint | Slug | Notes |
|---|---|---|
| **Sprint IPAG** | `sprintipag` | Ecole IPAG |
| **Ecole 3A** | `pca_2026` | Slug cryptique — OK si intentionnel |
| **Bootcamp VEGA** | `adecco` | Client Adecco |
| **Design** | `design` | ⚠️ même slug que hub Design |

---

## 4. Cohortes — 16 cohortes à compléter

### Champs à remplir par cohorte

- [ ] `capacity` → ex: 20 (nb max apprenants)
- [ ] `enrollment_deadline` → date limite inscription
- [ ] `enrollment_url` → URL Fillout/Stripe spécifique (ex: `https://impulsion.fillout.com/cohorte-w14`)
- [ ] `lead_instructor` → relation DB Instructors

### Remplir en batch

Les 16 cohortes sont mensuelles ou hebdomadaires (W3→W14 + oct25/nov25/dec). Typiquement :
- Même `lead_instructor` pour toutes les cohortes d'un même hub
- `capacity` identique (ex: 20 partout)
- `enrollment_url` spécifique par cohorte

Si tu veux, je peux écrire un script qui applique un template par batch (ex: "toutes les cohortes de Challenge → lead=Arthur, capacity=20, URL=pattern"). Dis-moi.

---

## 5. Images — specs exactes

### Cover images (OG)
- **Dimensions** : 1200×630px (standard OG)
- **Format** : JPG ou PNG, < 300 KB
- **Contenu** : titre hub + visuel brand
- **Template Figma/Canva conseillé** : tu peux générer 8 visuels en 30 min

### Thumbnails
- **Dimensions** : 400×300px (ratio 4:3)
- **Format** : JPG, < 80 KB
- **Contenu** : visuel sans texte (cards listes)

### Photos Instructors
- **Dimensions** : 500×500px carré
- **Format** : JPG, < 150 KB
- **Contenu** : portrait visage (centré)

---

## 6. Champs legacy à considérer

Quelques champs existants que tu peux maintenant nettoyer si tu veux :

### Hubs
- `password` — rich_text legacy du gating cookie. Toujours utilisé ?
- `description` — rich_text. Utiliser à la place de `target_audience` si tu préfères, ou garder les deux (description = pitch court, target_audience = pour qui).

### Jours
- `livrable` — rich_text, vide partout. À remplir progressivement (production attendue de l'apprenant) ou supprimer.
- Préfixes `[Gratuit]_Jour X` / `[Programme]_Jour X` dans le title `Jours` — on a skippé `access_tier`, donc ces préfixes restent pour l'instant.

---

## 7. Workflow recommandé

**Phase A (2-3h) — pour shipper une version publiable** :
1. Créer 1 ligne DB Instructors (toi)
2. Pour 2-3 hubs phares (Challenge, Programme, 30jc) :
   - `publishing_status=published`
   - Cover image + thumbnail
   - `instructors` → toi
   - `target_audience` + `prerequisites` + `learning_outcomes` (templates ci-dessus)
3. Pour la cohorte active en cours (ex: W10 ou W11) :
   - `lead_instructor` → toi
   - `capacity` + `enrollment_url`

**Phase B (1 jour) — enrichissement complet** :
- Compléter les 5 autres hubs
- Compléter les 4 sprints
- Compléter les 15 autres cohortes
- Nettoyer les slugs problématiques (agent-veille, design conflict)

**Phase C (post-Sprint 4)** :
- Activer `certificate_enabled` sur hubs concernés
- Uploader logo/signature pour certificats
- Remplir `livrable` sur les 61 jours si tu veux renforcer le discours "livrable public"

---

## 8. Signaux que j'ai détectés à arbitrer

| Signal | Action |
|---|---|
| 2 hubs avec slug `design` possible conflit route | Renommer le sprint Design en `design-sprint` ou déplacer sur une autre route |
| `21 Jours Chrono` a slug `test30` | Renommer en `21jc` ? |
| `Agent de veille` a slug `lab/agent-veille` | Le `/` dans slug peut casser le routing Next `[...slug]` — renommer en `agent-veille` |
| `Challebfe` (typo) avec slug `challenge-5j` | Renommer title en "Challenge 5 jours" |
| `Hubr` hub (vu dans search) pas dans les 8 listés | Vérifier s'il existe encore ou s'il est archivé |

---

## 9. Si tu veux un script pour batch-remplir

Une fois que tu as le template rédactionnel défini (mêmes prerequisites pour tous les hubs, par ex), je peux écrire un script qui applique les valeurs en batch via l'API Notion. Exemples :

- "Pour tous les hubs : `certificate_enabled=true` + template prerequisites générique"
- "Pour toutes les cohortes de Challenge : `lead_instructor=Arthur` + `capacity=20`"
- "Pour toutes les cohortes W10-W14 : `enrollment_deadline = [date]`"

Dis-moi les règles, j'écris et je lance.

---

## 10. Prochaine étape

Quand t'as fait **Phase A au minimum** (3 hubs + 1 cohorte publiables) + uploadé les photos, ping-moi :

1. Je **re-sync** le site côté Next.js (update `types.ts` et `sync/route.ts` pour consommer les nouveaux champs)
2. Je lance **Sprint 2** (auth magic link + Neon Postgres + progress API unifiée Hub/Sprint)

Sprint 2 = la partie lourde : vraie DB utilisateurs, progression trackée, transformation de Notion Publisher en vrai LMS vendable.
