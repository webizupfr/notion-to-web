# Impulsion — Plan d’implémentation v2

> Objectif : livrer une app **solide, scalable et homogène** pour deux univers séparés (A: Hubs/Cohortes/Ateliers, B: Sprints/Hackathons), avec **YAML contract** partagé, **sync KV** propre, **routes front** claires et **déverrouillage horaire** sur les modules de Sprint.

---

## 0) Scope & principes

* Deux univers **séparés** (sources Notion distinctes, namespaces KV distincts), **même design system & widgets**.
* **Notion-first** : tout paramétrage côté contenu se fait via propriétés + YAML (meta/widget).
* **Aucune duplication** : ateliers dérivés = sous-ensemble de jours d’un hub existant ; sprints = assemblage de modules réutilisables.
* **Sécurité by design** : contenu des modules verrouillés **non livré** avant l’heure.
* ENV requis : `NOTION_WORKSHOPS_DB`, `NOTION_SPRINTS_DB` (modules & activités sont résolus via relations ; pas d’ENV séparés).

---

## 1) Univers A — Hubs / Cohortes / Ateliers dérivés

### 1.1 Tables Notion

**HUBS_DB** (existant)

* `name` (Title) — ex. « 30 Jours Chrono »
* `slug` (Text) — `30-jours-chrono`
* `type` (Select) — `program`
* `visibility` (Select) — `public|private`
* `meta` (Code/YAML) — cf. contrats YAML
* `cohorts` (Relation → COHORTS_DB)
* `days` (Inline DB) — DB « Days » imbriquée

**DAYS_DB** (inline dans chaque hub)

* `name` (Title) — « Jour 05 — Crée ton assistant »
* `slug` (Text) — `day-05`
* `number` (Number) — 5
* `activities` (Relation/inline) — optionnel
* `offsetDays` (Number) — 0 pour J1, 1 pour J2…
* `duration` (Number) — minutes
* `meta` (Code/YAML)

**COHORTS_DB** (existant)

* `name` (Title)
* `cohortSlug` (Text)
* `startDate` (Date)
* `hub` (Relation → HUBS_DB)
* `visibility` (Select) — `public|private`
* `password` (Text)
* `meta` (Code/YAML)

**WORKSHOPS_DB** (NOUVEAU)

* `name` (Title) — « Atelier IA : Crée ton assistant »
* `slug` (Text) — `atelier-assistant-ia`
* `derived_from_hub` (Relation → HUBS_DB)
* `days_selected` (Relation → DAYS_DB du hub)
* `duration` (Select) — `1/2 jour|1 jour|2 jours`
* `audience` (Select) — entrepreneurs|étudiants|salariés…
* `format` (Select) — présentiel|distanciel
* `visibility` (Select)
* `meta` (Code/YAML)

### 1.2 YAML (contrat)

**Hub**

```yaml
hub_meta:
  layout: timeline      # timeline|sections
  color_theme: amber
  show_progress: true
  unlock_strategy: cohort  # cohort|none
  header_variant: default  # default|compact
```

**Day**

```yaml
day_meta:
  icon: "🤖"
  color: yellow
  layout: list           # list|grid
  callout: "Focus IA appliquée"
```

**Cohorte**

```yaml
cohort_meta:
  access_banner: true
  reminder_note: "Déblocage quotidien à 8h"
```

**Workshop**

```yaml
workshop_meta:
  source: hub
  derived_from: "30-jours-chrono"
  layout: grid           # grid|list
  color_theme: amber
  show_progress: false
  unlock_strategy: none
  display_header: true
  print_ready: true
```

**Widgets (communs)**

```yaml
widget: |
  type: FormWidget
  title: "Définir ton problème"
  fields:
    - label: "Problème observé"
      placeholder: "Décris la situation"
    - label: "Impact"
      placeholder: "Quel est le coût si rien ne change ?"
```

### 1.3 Backend (sync)

* **Bundles KV**

  * Hub : `hub:page:/hub/${hubSlug}`
  * Cohorte : `cohort:page:/cohort/${cohortSlug}/${hubSlug}`
  * Workshop : `workshop:page:/atelier/${workshopSlug}`

* **Pipeline Workshop**

  1. Lire `WORKSHOPS_DB`.
  2. Pour chaque atelier, charger `hubSlug` & `days_selected` (IDs Days).
  3. Récupérer `hub.learningPath.days` (bundle hub) et filtrer par IDs.
  4. Écrire bundle `workshop:*` (sans unlock, progression off).

* **Invalidations ISR**

  * Tags : `page:hub:${hubSlug}` / `page:cohort:${cohortSlug}` / `page:workshop:${slug}`

### 1.4 Front

* Routes : `/hub/[hubSlug]`, `/cohort/[cohortSlug]/[hubSlug]`, `/atelier/[slug]`
* **Workshop UI** : layout « grid/list », bandeau « dérivé de [hub] », progression désactivée, bouton Export/Print optionnel.
* LocalStorage (si actif) : `workshop:<slug>::block:<blockId>`

---

## 2) Univers B — Sprints / Hackathons (modulaire + unlock horaire)

### 2.1 Tables Notion

**SPRINTS_DB**

* `name` (Title)
* `slug` (Text) — `hackathon-canvas-oct25`
* `type` (Select) — `sprint|hackathon`
* `context` (Text)
* `modules` (Relation → MODULES_DB)
* `duration` (Number)
* `format` (Select) — présentiel|hybride|distanciel
* `startDateTime` (DateTime) — réf. offsets (optionnel)
* `timezone` (Text) — `Europe/Paris` (défaut)
* `visibility` (Select)
* `meta` (Code/YAML)

**MODULES_DB**

* `name` (Title), `slug` (Text), `description` (Text)
* `activities` (Relation → ACTIVITIES_DB)
* `duration` (Number), `tags` (Multi-select), `state` (Select)
* **Déverrouillage** (au choix, colonnes ou YAML) :

  * Relative : `unlockOffsetDays` (Number), `unlockTime` (Text HH:mm)
  * Absolute : `unlockAt` (DateTime)
* `meta` (Code/YAML)

**ACTIVITIES_DB**

* `name` (Title), `slug` (Text)
* `type` (Select) — Inspiration|Challenge|Canvas|Quiz|Livrable
* `duration` (Number), `content` (Rich), `tags`
* `widget` (Code/YAML)
* `module` (Relation → MODULES_DB)
* `meta` (Code/YAML)

### 2.2 YAML (contrat)

**Sprint**

```yaml
sprint_meta:
  color_theme: teal
  layout: timeline       # timeline|grid
  mode: simple           # simple|team (plus tard)
  show_progress: true
  timezone: "Europe/Paris"
  unlock_strategy: "relative"  # relative|absolute|none
```

**Module (déverrouillage via YAML — prioritaire sur colonnes)**

```yaml
module_meta:
  unlock:
    mode: "absolute"        # absolute|relative|none
    at: "2025-11-03 09:00"  # heure locale si absolute
    offsetDays: 1            # si relative
    time: "09:00"           # si relative
  lock_banner: "Ouverture à 9h précises."
```

**Activity (widget)**

```yaml
widget: |
  type: CanvasWidget
  title: "Problème / Solution"
  sections:
    - name: "Problème"
      placeholder: "Quel est le pain principal ?"
    - name: "Solution"
      placeholder: "Quelle proposition apporte de la valeur ?"
```

### 2.3 Backend (sync) — hydratation + lock sécurisé

* **Bundle KV Sprint** : `sprint:page:/sprint/${slug}`
* **Hydratation**

  * Lire Sprint → Modules → Activities (avec YAML).
  * Calculer `unlockAt` **serveur** (timezone sprint) :

    * si `module_meta.unlock.mode == absolute` → `unlockAt = parse(at)`
    * sinon si relative → `unlockAt = startDateTime + offsetDays @ time`
    * sinon → unlocked
  * Capturer les blocks Notion de la page Sprint (via `contextBlocks`) pour reproduire l’accueil « Hub » sans page dédiée dans `PAGES_DB`.
  * Stocker aussi les `contextNavigation` (si définies) et l’ID Notion (fallback vers une navigation synthétique « Modules » côté front).
* **Sécurité** : si **locked**, **ne pas inclure** `activities` dans le bundle. Écrire un **stub module** :

```json
{
  "slug": "ideation",
  "title": "Idéation",
  "isLocked": true,
  "unlockAtISO": "2025-11-03T08:00:00.000Z"
}
```

* **Unlocked** : inclure `activities[]` hydratées (widget YAML parsé).
* **Invalidations ISR** : `page:sprint:${slug}` ; prévoir **cron** (QStash) aux `unlockAt` pour revalidate auto (optionnel).

### 2.4 Front

* **Routes** : `/sprint/[slug]` (alias `/hackathon/[slug]`), `/sprint/[slug]/[moduleSlug]` (SSR lock gate), `/sprint/[slug]/[moduleSlug]/[activitySlug]` (optionnel).
* **Page Sprint** : layout Hub-like — Blocks Notion contextuels en haut, sidebar neutre (navigation Notion ou synthétique « Modules »), cards modules (lock + countdown).
* **Page Module (SSR)** :

  * Recalcule lock côté serveur.
  * **Locked** → `LockScreen` (heure locale + countdown + refresh).
  * **Unlocked** → StepWizard + ActivityContent (Notion) sur les activités ordonnées, `revalidateTag('module:<id>')`.
* **Countdown/Timezone** : affichage `Europe/Paris` (ou `sprint_meta.timezone`), conversions via `date-fns-tz`.
* **Progression locale** :

  * Module : `sprint:<slug>::module:<moduleSlug>`
  * Activity : `sprint:<slug>::activity:<activitySlug>`

---

## 3) YAML — parsing & validation (communs A/B)

* Parser unique (TS) + **Zod schemas** : `MetaSchema`, `WidgetSchemas`.
* Étapes :

  1. `yaml.safeLoad()` → objet
  2. `schema.parse()` → validation + defaults
  3. **merge** colonnes ↔ YAML (priorité YAML pour `module_meta.unlock`)
  4. Registry composants (map `type` → React component)
  5. Fallback UI si invalide (bannière « configuration invalide » + logs)

---

## 4) Namespaces / Stockage / Sécurité

* **KV** : `hub:*`, `cohort:*`, `workshop:*`, `sprint:*`
* **LocalStorage** : namespacer par univers (voir ci-dessus) pour éviter collisions.
* **/gate** réutilisé pour `visibility=private` (workshops/sprints).
* **Aucune fuite** : modules Sprint verrouillés **sans contenu** côté client.

---

## 5) Performance & DX

* ISR pages (60s), invalidations par tag.
* QStash cron pour unlocks (optionnel mais recommandé).
* Cloudinary/Blob : sous-chemins `hubs/`, `workshops/`, `sprints/`.
* Bundle split par route (App Router), lazy widgets.
* Logs structurés sync + instrumentation simple (pageviews par univers, events widget).

---

## 6) Tests — Definition of Done

1. **Workshop** : sélection 2 `days_selected` → `/atelier/[slug]` affiche uniquement ces jours, sans unlock, layout grid.
2. **Sprint** : 2 modules (dont 1 locked) + 3 activities → `/sprint/[slug]` : countdown sur le locked, aucun JSON d’activités livré avant l’heure.
3. **Module SSR gate** : visite avant l’heure → LockScreen ; après l’heure → contenu & activités visibles.
4. **Cohorte** : unlock par `startDate + offsetDays` inchangé.
5. **YAML** : Form/Quiz/Canvas fonctionnent dans A & B ; clés inconnues ignorées, erreurs loggées.
6. **Perf** : LCP < 2s, pas de CLS notable.

---

## 7) Déploiement — Checklist

* [ ] Créer `WORKSHOPS_DB`, `SPRINTS_DB`, `MODULES_DB`, `ACTIVITIES_DB` (schémas ci-dessus).
* [ ] Écrire/mettre à jour **schemas TS** (Meta/Widget) + **yaml-registry**.
* [ ] Étendre `/api/sync` : pipelines Workshop & Sprint + namespaces KV + invalidations.
* [ ] Ajouter routes `/atelier/[slug]`, `/sprint/[slug]` (+ gate module SSR).
* [ ] Intégrer Countdown, LockBanner, ModuleCard (états).
* [ ] QStash cron (option) pour revalidate unlocks.
* [ ] Rédiger README « Créer un Atelier » & « Composer un Sprint ».

---

## Annexes — Snippets utiles

**Compute unlock (server)**

```ts
function computeUnlockAt({ module, sprintMeta, sprintStart }: { module: any; sprintMeta: any; sprintStart?: Date }) {
  const tz = sprintMeta?.timezone || 'Europe/Paris';
  const mode = module.meta?.unlock?.mode;
  if (mode === 'absolute' && module.meta?.unlock?.at) return toUtc(module.meta.unlock.at, tz);
  if (mode === 'relative' && sprintStart) {
    const d = addDays(sprintStart, module.meta.unlock.offsetDays || 0);
    const [h, m] = (module.meta.unlock.time || '09:00').split(':').map(Number);
    return zonedTimeToUtc(set(d, { hours: h, minutes: m, seconds: 0, milliseconds: 0 }), tz);
  }
  // Colonnes fallback
  if (module.unlockAt) return toUtc(module.unlockAt, tz);
  if (sprintStart && module.unlockOffsetDays != null) {
    const d = addDays(sprintStart, module.unlockOffsetDays);
    const [h, m] = (module.unlockTime || '09:00').split(':').map(Number);
    return zonedTimeToUtc(set(d, { hours: h, minutes: m, seconds: 0, milliseconds: 0 }), tz);
  }
  return null; // unlocked
}
```

**Module stub (locked)**

```json
{"slug":"ideation","title":"Idéation","isLocked":true,"unlockAtISO":"2025-11-03T08:00:00.000Z"}
```

**Registry widgets (extrait)**

```ts
const WIDGETS = {
  FormWidget: lazy(() => import('@/widgets/FormWidget')),
  QuizWidget: lazy(() => import('@/widgets/QuizWidget')),
  CanvasWidget: lazy(() => import('@/widgets/CanvasWidget')),
};
```

**LocalStorage keys (rappel)**

* hub → `hub:<hubSlug>::block:<id>`
* cohort → `cohort:<cohortSlug>::block:<id>`
* workshop → `workshop:<slug>::block:<id>`
* sprint module → `sprint:<slug>::module:<moduleSlug>`
* sprint activity → `sprint:<slug>::activity:<activitySlug>`

---

**Fin du document.**

> Partage direct à l’équipe : ce plan suffit pour créer les DB Notion, étendre la sync, ajouter les routes et livrer une v2 robuste avec ateliers dérivés et déverrouillage horaire sur Sprints.
