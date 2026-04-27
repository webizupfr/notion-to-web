# Notion — Plan de migration & enrichissement

> Checklist actionnable pour nettoyer et enrichir les 7 DBs Notion avant Sprint 2 (auth + DB progression). À faire dans Notion, pas dans le code.
>
> Temps estimé total : **Tier 0 = 1-2h** · **Tier 1 = 1 jour**.
>
> Coche au fur et à mesure. Quand Tier 0+1 sont faits, ping-moi pour lancer Sprint 2.

---

## 🔴 Tier 0 — Hygiène (faire en premier, ~1-2h)

### DB_Hubs

- [ ] **Supprimer les 2 lignes vides** (artefacts export). Filter `Title != ""`.
- [ ] **Évaluer `DB Workshops`** : soit définir ce qu'est un workshop vs un hub (doc le concept), soit supprimer la colonne. Si tu ne sais pas, **supprime** — le code a un `WorkshopBundle` séparé qui semble dead weight.
- [ ] **Supprimer 4 constantes inutiles** OU les rendre vraiment variables :
  - `mode_de_unlock` (toujours `manuel`)
  - `progression_max_jours` (toujours `1`)
  - `sync_strategy` (toujours `full`)
  - `max_depth` (toujours `3`)

  Recommandation : supprime. Si un jour tu veux vraiment différencier, tu les ré-ajouteras avec des valeurs distinctes.

### _Hubs__Cohortes_DB

- [ ] **Renommer `end dat` → `end_date`** (typo).
- [ ] Les valeurs existantes de dates sont préservées (Notion rename = safe).

### _Hubs__Jours_DB

- [ ] **Supprimer les colonnes vides** qui n'ont jamais de valeurs : `status`, `etat`, `resume`, `livrable` (si aucune valeur partout).
  - Si tu veux en garder certaines (`livrable` par exemple est utile à terme), laisse-la et on la remplira progressivement. Mais supprime les autres.

### _Hubs__Activités_DB

- [ ] **Renommer le doublon `titre`** :
  - Colonne 1 (ex. `Jour8_Intro`) → `internal_id`
  - Colonne 4-5 (ex. "Prêt pour le jour 8 ?") → `title`
  - (Garde `title` en snake_case pour être cohérent)
- [ ] Vérifier que les valeurs sont préservées après rename.

### DB_Sprints

- [ ] **Supprimer les lignes vides** (1 ligne vide identifiée dans l'export).
- [ ] **Standardiser `duration`** : actuellement souvent vide ou en texte. Convertir en **Number** (minutes). Ex : "3h" devient `180`.

### _Sprint__Modules_DB

- [ ] **Standardiser `duration`** en Number (minutes).

### _Sprint__Activités_DB

- [ ] `duration` est déjà en entier (minutes) — rien à faire.
- [ ] **Uniformiser `type`** : actuellement texte vide. Soit :
  - Le convertir en **Select** avec mêmes options que `_Hubs__Activités_DB.type` (`Intro` / `step` / `conclusion`), cohérent entre les 2 univers
  - Soit le supprimer si pas utilisé

### Toutes les tables (convention naming)

- [ ] **Adopter snake_case** en propriété Notion quand possible :
  - `Title` → `title` (Hubs, Sprints, Jours)
  - `Name` → `title` (Cohortes, Modules Sprint, Activités Sprint) — pour qu'on ait `title` partout
  - `Last Updated` / `Last edited time` → Notion system fields, OK
  - `ordre` / `Ordre` → choisir un seul (`order`)

  💡 Ce n'est pas critique si c'est trop long. Mais ça rend le code plus propre côté sync.

---

## 🟠 Tier 1 — Enrichissement (~1 jour)

### DB_Hubs — ajouter 9 champs

| Champ | Type Notion | Options / Valeurs | Usage code |
|---|---|---|---|
| `publishing_status` | Select | `draft`, `published`, `archived` | Pipeline sync ignore les `draft` |
| `cover_image` | Files & media | — | OG image, card hub, certificate header |
| `thumbnail` | Files & media | — | Cards / listes (plus petit que cover) |
| `instructor_name` | Text | — | Schema.org Course, certificat |
| `instructor_bio` | Text | 2-3 phrases | Hub page "À propos de l'instructeur" |
| `estimated_duration_minutes` | Number | ex: 1800 (30h) | Schema.org Course `timeRequired` |
| `target_audience` | Text | 1-2 phrases | "Pour qui c'est" section hub |
| `prerequisites` | Text (multi-ligne) | liste ou prose | "Ce qu'il faut savoir avant" |
| `learning_outcomes` | Text (multi-ligne) | liste à puces | "À la fin vous saurez X, Y, Z" — section hub |
| `certificate_enabled` | Checkbox | — | Le hub émet-il un certificat ? |

### _Hubs__Cohortes_DB — ajouter 4 champs

| Champ | Type Notion | Valeurs | Usage |
|---|---|---|---|
| `capacity` | Number | ex: 30 | Affichage "Plus que N places" |
| `enrollment_deadline` | Date | — | Affichage "Inscriptions jusqu'au DD/MM" |
| `enrollment_url` | URL | ex: Fillout form cohorte-spécifique | Bouton "S'inscrire" dynamique par cohorte |
| `lead_instructor` | Relation → `DB_Hubs.instructor_name` OU Text | — | Permet qu'une cohorte ait un instructeur ≠ défaut hub |

### _Hubs__Jours_DB — ajouter 1 champ

| Champ | Type Notion | Options | Usage |
|---|---|---|---|
| `access_tier` | Select | `free`, `paid`, `preview` | Remplace le hack du préfixe `[Gratuit]_` dans le champ `Jours` |

  ⚠️ **Après avoir créé `access_tier`** : pour les jours dont l'identifiant commence par `[Gratuit]`, mettre `access_tier=free`. Pour les autres, `access_tier=paid`. Puis **supprimer le préfixe `[Gratuit]_`/`[Programme]_`** du champ `Jours` — c'est devenu redondant.

### DB_Sprints — ajouter 5 champs (même logique que Hubs)

| Champ | Type Notion | Valeurs | Usage |
|---|---|---|---|
| `publishing_status` | Select | `draft`, `published`, `archived` | Pipeline sync |
| `cover_image` | Files & media | — | OG, card sprint |
| `thumbnail` | Files & media | — | Listes |
| `instructor_name` | Text | — | Schema.org Course |
| `estimated_duration_minutes` | Number | somme des modules | Schema.org |
| `capacity` | Number | — | Places dispo |

---

## 🟢 Tier 2 — Plus tard (référence, ne fais rien maintenant)

Ces champs seraient des plus-values, mais **ne bloquent pas Sprint 2**. On verra selon les besoins clients post-lancement :

- `category` / `tags` (multi-select) sur Hubs et Sprints — pour filtrage sur /hubs index + SEO topic clustering
- `video_intro_url` (URL) sur Hubs — vidéo d'intro cours type Loom/YouTube pour landing
- Mini-DB `faq` avec relation Hubs — Schema.org FAQPage rich snippet
- Mini-DB `testimonials` avec relation Hubs/Sprints — preuves sociales type super.so
- `next_cohort_auto` (Rollup) sur Hubs — donne toujours la prochaine cohorte à afficher

---

## 📋 Checklist finale à cocher

### Tier 0 (bloquant Sprint 2 à 20% — juste pour éviter du code sale)
- [ ] DB_Hubs : lignes vides supprimées + 4 constantes retirées + DB Workshops tranchée
- [ ] _Hubs__Cohortes_DB : `end dat` → `end_date`
- [ ] _Hubs__Jours_DB : colonnes vides supprimées
- [ ] _Hubs__Activités_DB : doublon `titre` renommé → `internal_id` + `title`
- [ ] DB_Sprints : lignes vides supprimées + `duration` en Number
- [ ] _Sprint__Modules_DB : `duration` en Number
- [ ] _Sprint__Activités_DB : `type` unifié ou supprimé

### Tier 1 (bloquant features LMS — Sprint 2+ en dépend)
- [ ] DB_Hubs : 10 nouveaux champs ajoutés (publishing_status, cover_image, thumbnail, instructor_name, instructor_bio, estimated_duration_minutes, target_audience, prerequisites, learning_outcomes, certificate_enabled)
- [ ] _Hubs__Cohortes_DB : 4 nouveaux champs (capacity, enrollment_deadline, enrollment_url, lead_instructor)
- [ ] _Hubs__Jours_DB : `access_tier` ajouté + préfixes `[Gratuit]_` migrés vers le select
- [ ] DB_Sprints : 6 nouveaux champs (publishing_status, cover_image, thumbnail, instructor_name, estimated_duration_minutes, capacity)

---

## 🔁 Après la migration

Une fois coché, ping-moi. Je ferai :

1. **Update `src/lib/types.ts`** — ajouter les nouveaux champs dans les types `PageBundle`, `HubMeta`, `CohortMeta`, `DayEntry`, `SprintBundle`, `SprintModule`
2. **Update `src/app/api/sync/route.ts`** — mapper les nouvelles propriétés Notion → KV bundles
3. **Update rendu pages** — afficher `instructor_name`, `prerequisites`, `learning_outcomes`, `estimated_duration` sur hub pages
4. **Lancer Sprint 2** — schéma Drizzle unifié (`users`, `enrollments`, `progress`) + NextAuth magic link

---

## ❓ Si blocage

Si un champ n'est pas clair ou si tu veux adapter (ex: renommer `learning_outcomes` en `objectifs_finaux`), dis-moi simplement — on ajuste le mapping code-side. L'important c'est que **les champs existent en Notion**, le naming exact est négociable.

Si tu veux **skip un champ** (ex: pas de certificats donc pas besoin de `certificate_enabled`), flague-le — on l'enlèvera du mapping.
