# Plan d’implémentation — Cohortes + Modules (Hackathon)

Audience: agent de code + auteur Notion. Objectif: activer des cohortes (même hub, calendriers différents) et généraliser le parcours « jours » vers « modules » (hackathon), sans dupliquer le contenu Notion et en conservant la même UX (sidebar, étapes, « Aujourd’hui »).

---

## Résultat attendu
- Même hub Notion, plusieurs cohortes possibles avec calendrier d’ouverture distinct (relative à une date de démarrage ou absolue par date/heure).
- Routage lisible par cohorte: `/<hub>/c/<cohorte>` (recommandé) ou `/<hub>?cohort=<slug>` (fallback).
- Parcours générique: « jours » (30J Chrono) ou « modules/sessions » (hackathon), avec libellés configurables.

---

## 0) Pré-requis & principes
- Pas de duplication de contenu: une seule base pour hub + unités (jours/modules) + activités.
- Les cohortes ne créent pas de nouvelles pages KV: on applique un « overlay » de planning au runtime selon la cohorte.
- Timezone cohorte respectée pour « Aujourd’hui » et les déblocages.

Env vars à ajouter:
- `NOTION_COHORTS_DB=<database_id>` (nouvelle DB Cohortes)

---

## 1) À faire dans Notion (par l’auteur)

### 1.1 DB « Cohortes » (nouvelle)
Créer une database Notion « Cohortes » avec ces propriétés (noms conseillés; la détection est tolérante si besoin):
- Title: `Name` (title)
- `slug` (rich_text) — unique, utilisé dans l’URL
- `hub` (relation → Hubs DB) — associe la cohorte à un hub
- `start_date` (date) — début de la cohorte
- `end_date` (date, optionnel)
- `timezone` (select) — ex. `Europe/Paris`
- `visibility` (select: `public` | `private`)
- `password` (rich_text, optionnel) — comme les pages privées existantes
- `schedule_mode` (select: `relative` | `absolute`)
- `unit_label_singular` (rich_text, optionnel) — ex. `Jour` | `Module`
- `unit_label_plural` (rich_text, optionnel) — ex. `Jours` | `Modules`

Notes:
- `relative`: les dates de déblocage sont calculées à partir de `start_date` et de `order` (ou `unlock_offset_days` si présent sur l’unité).
- `absolute`: on privilégie les dates de l’unité (`unlock_date`), sinon fallback relatif.

### 1.2 DB « Unités » (jours/modules)
La DB existante qui liste « Jour 1..n » pour 30J Chrono peut servir pour les hackathons (modules). Assurez-vous des propriétés:
- `order` (number) — obligatoire
- `unlock_offset_days` (number, optionnel) — décalage relatif spécifique
- `unlock_date` (date, optionnel) — déblocage absolu (peut inclure l’heure)
- `state` (status/select) — ex. « verrouillé/ouvert » (déjà géré)
- `summary` (rich_text) — résumé court (déjà géré)

Synonymes acceptés au niveau de la détection du type de parcours: « jour/journée », « module », « session », « phase », « sprint ».

### 1.3 DB « Activités » (existant)
Conservez la relation vers l’unité (jour/module). Propriétés utiles (déjà exploitées):
- `title` (title)
- `order` (number) — ordre des étapes
- `type` (select/status) — ex. `intro`, `step`, `conclusion`, `option` (les `option` sont ignorées dans le wizard)
- `duration` (rich_text/number)
- `url` (url)
- `instructions` (rich_text)

---

## 2) Plan d’implémentation (agent de code)

### Étape A — Types & schéma (1)
1. `src/lib/types.ts`
   - Étendre `LearningPath`:
     - `kind: 'days' | 'modules'`
     - `unitLabelSingular?: string`
     - `unitLabelPlural?: string`
   - Ajouter un type `CohortMeta`:
     - `slug: string; hubNotionId: string; startDate: string; endDate?: string | null; timezone: string; visibility: 'public' | 'private'; password?: string | null; scheduleMode: 'relative' | 'absolute'; unitLabelSingular?: string; unitLabelPlural?: string;`

### Étape B — Lib Cohortes (2)
2. `src/lib/cohorts.ts` (nouveau)
   - `getCohortBySlug(slug: string): Promise<CohortMeta | null>` — query la DB `NOTION_COHORTS_DB` et mappe les champs.
   - `listCohortsForHub(hubNotionId: string): Promise<CohortMeta[]>`.
   - `applyCohortOverlay(path: LearningPath, cohort: CohortMeta): LearningPath` — calcule `unlockDate` final par unité selon `scheduleMode` et `timezone`.
   - `nowInTimezone(tz: string): Date` — utilitaire pour « Aujourd’hui ».
   - Cache: mémoire process + `unstable_cache` 60s par cohorte.

### Étape C — Builder LearningPath (3)
3. `src/app/api/sync/route.ts`
   - Élargir `buildLearningPathFromPage(pageId, hubSlug)` pour:
     - Détecter la DB « unités » même si elle s’appelle « Module/Session/Phase/Sprint » (utiliser la fonction `normalize` déjà présente pour comparer).
     - Renseigner `learningPath.kind` (`days` si « jour », sinon `modules`).
     - Renseigner des labels par défaut: `Jour/Jours` si « jour », `Module/Modules` sinon. Conserver la structure actuelle (tri par `order`, filtrage des `option`).
   - Ne pas changer la persistance KV: ces labels sont stockés dans `bundle.meta.learningPath`.

### Étape D — Routage & overlay cohorte (4)
4. `src/app/(site)/[...slug]/page.tsx`
   - Parsing des segments:
     - Si pattern `/<hub>/c/<cohort>` →
       - `hubSlug = segments[0]`, `cohortSlug = segments[2]`.
       - `contentSlug = hubSlug` (utilisé pour charger `getPageBundle(contentSlug)`).
       - `basePathForLinks = /${hubSlug}/c/${cohortSlug}` (à utiliser pour le StepWizard/NextLink).
     - Sinon (pas de cohorte) → comportement actuel.
   - Charger la cohorte (`getCohortBySlug`) et appliquer `applyCohortOverlay` sur `meta.learningPath` si disponible.
   - Gating: si `cohort.visibility === 'private'`, appliquer la même logique que pour les pages privées (clé via `?key=`/`gate_key`). `cohort.password` prime sur le password de page.
   - Passer à la sidebar et au composant « Aujourd’hui »:
     - `learningKind = meta.learningPath.kind`
     - `unitLabelSingular/Plural` (cohorte > hub par défaut)
     - `releasedDays` recalculé avec l’overlay.
   - Important: `Blocks` conserve `currentSlug` tel que visible (incluant `/c/<cohort>`) pour que la navigation des étapes reste sur la cohorte.

### Étape E — UI labels & variantes (5)
5. `src/components/learning/StartToday.tsx`
   - Ajouter des props facultatives: `{ days: DayEntry[]; unitLabelSingular?: string }`.
   - Remplacer l’affichage « Jour {n} » par `{unitLabelSingular ?? 'Jour'} {n}`.
6. `src/components/layout/PageSidebar.tsx`
   - Ajouter des props facultatives: `{ learningKind?: 'days' | 'modules'; unitLabelSingular?: string }`.
   - Si `learningKind==='days'` → conserver le groupement par semaine (comportement actuel).
   - Si `learningKind==='modules'` → afficher une simple liste ordonnée des unités (sans regroupement semaine).

### Étape F — Endpoint de debug (6)
7. `src/app/api/debug/cohort/route.ts` (nouveau)
   - `GET ?hub=<slug>&cohort=<slug>`
   - Charge le bundle du hub, la cohorte, applique l’overlay et retourne `{ learningPath, unitLabels, kind, now }` pour QA rapide.

### Étape G — Config & doc (7)
8. `.env.local` / Vercel:
   - Ajouter `NOTION_COHORTS_DB`
9. `docs/` (présent fichier): garder à jour les propriétés et exemples.

---

## 3) Détails de mapping (référence)

### 3.1 CohortMeta (lecture Cohortes DB)
- `slug`: `rich_text` (trim)
- `hubNotionId`: récupérer l’ID de la relation `hub` (première entrée) → ID Notion de la page hub
- `startDate`/`endDate`: `date.start` iso
- `timezone`: `select.name` (fallback `Europe/Paris`)
- `visibility`: `select` → `public`/`private`
- `password`: `rich_text` (optionnel)
- `scheduleMode`: `select` → `relative`/`absolute` (fallback `relative`)
- `unitLabelSingular`/`unitLabelPlural`: `rich_text` (optionnels)

### 3.2 LearningPath overlay
- Mode `relative`:
  - `unlockDate = start_date + (order - 1) jours` (ou `unlock_offset_days` si présent)
- Mode `absolute`:
  - `unlockDate = unit.unlock_date` si défini
  - sinon fallback relatif
- Comparaison « aujourd’hui »: calculer une clé date `YYYY-MM-DD` en timezone de la cohorte (même stratégie que `StartToday.tsx`).

### 3.3 Détection « jours » vs « modules »
- Utiliser un `normalize` (existant) pour comparer les titres de DB:
  - `days`: strings contenant `jour`, `journée`
  - `modules`: `module`, `session`, `phase`, `sprint`
- Labels par défaut:
  - days → `Jour/Jours`
  - modules → `Module/Modules`

---

## 4) Tests & critères d’acceptation

Scénarios manuels:
1. 30J Chrono sans cohorte (par défaut):
   - Sidebar groupée par semaine
   - « Aujourd’hui » pointe le bon jour
2. 30J Chrono avec 2 cohortes (`/studio-30j/c/janvier-2026` et `/studio-30j/c/mars-2026`):
   - Le contenu du hub est identique, mais « Aujourd’hui » et les `unlockDate` diffèrent selon `start_date`
   - Si `visibility=private` et mauvais `key`: redirection vers `/gate`
3. Hackathon (modules, absolute):
   - `kind='modules'`, labels `Module/Modules` visibles
   - Sidebar: liste simple des modules, sans regroupement semaine
   - Dates absolues (incluant l’heure) respectées; « Aujourd’hui » se met à jour avec la TZ cohorte
4. Debug endpoint: `/api/debug/cohort?hub=<slug>&cohort=<slug>` renvoie un JSON avec les dates calculées

Observabilité:
- Logs en cas de fallback (absolute manquant → relative)
- Ajout d’un champ `cohortSlug` dans les logs de page si présent

---

## 5) Risques & parades
- Doubles URLs (canonique): maintenir les liens internes dans le contexte de la cohorte (`basePathForLinks = /<hub>/c/<cohort>`). Optionnel: balise canonical si SEO critique.
- Timezone: centraliser `nowInTimezone` et comparaison par clé `YYYY-MM-DD`.
- Cohorte sans `hub` lié: retourner 400 dans l’endpoint debug et ignorer l’overlay en prod (render sans cohorte).

---

## 6) Découpage en sprints (estimations)
- Sprint 1 (0.5–1.5 j): Types + builder LP (kind + labels) + UI (StartToday, Sidebar)
- Sprint 2 (1–2 j): Cohortes (lib, overlay runtime, routing `/c/<cohort>`, gating)
- Sprint 3 (0.5–1 j): Debug endpoint, badges cohorte sur page hub, doc Notion
- Sprint 4 (1–2 j): QA hackathon (absolute), timezone fine-tuning, polish

---

## 7) Checklists

### 7.1 Auteur Notion
- [ ] Créer la DB « Cohortes » et remplir: `slug`, `hub`, `start_date`, `timezone`, `schedule_mode` (+ labels si besoin)
- [ ] Vérifier la DB Unités: `order` (requis), `unlock_offset_days` (opt), `unlock_date` (opt)
- [ ] Vérifier la DB Activités: relation vers unité + champs
- [ ] Créer 2 cohortes de test (publique + privée) sur un hub existant

### 7.2 Agent de code
- [ ] Étendre `src/lib/types.ts`
- [ ] Créer `src/lib/cohorts.ts` (lecture + overlay + cache)
- [ ] Étendre `buildLearningPathFromPage` dans `src/app/api/sync/route.ts`
- [ ] Adapter `src/app/(site)/[...slug]/page.tsx` (routing `/c/<cohort>`, overlay, gating)
- [ ] Adapter `StartToday` (labels) et `PageSidebar` (mode modules)
- [ ] Ajouter `src/app/api/debug/cohort/route.ts`
- [ ] Ajouter `NOTION_COHORTS_DB` à `.env` et config Vercel

---

## 8) Notes d’implémentation
- Ne pas multiplier les entrées KV: toujours charger le bundle de page `/<hub>` puis appliquer l’overlay en mémoire pour la cohorte.
- Préserver le `basePath` des composants (StepWizard, NextLink) pour rester dans la cohorte lors de la navigation.
- Conserver le gating déjà présent (clé via query/cookie) en le priorisant par cohorte quand elle est privée.

