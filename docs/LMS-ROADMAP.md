# Impulsion — Roadmap LMS et Expérience Apprenante

Ce document récapitule ce qui a été livré et propose une feuille de route pragmatique pour évoluer vers un LMS léger, fiable et agréable à utiliser, tout en conservant le flux Notion-first.

## 1) Récapitulatif des actions réalisées

- Sprints/Hackathons
  - Pipeline de sync complet (Notion → KV): Sprint, Modules, Activités, meta YAML, calcul de lock absolu/relatif, tri par `order`.
  - Aliases robustes pour les relations Notion: « DB Modules », « DB Activites/Activités » (et variantes).
  - Routes réorganisées sous `(site)` pour cohérence: `/sprint`, `/sprint/[slug]`, `/sprint/[slug]/[moduleSlug]`.
  - Page Sprint (accueil hub-like):
    - Affiche des `contextBlocks` (éditorial) + `contextNavigation` (callout 📌 + child pages).
    - Grille de modules (badges Module N / Jour X, tags, état Accessible/Countdown).
    - Section « Aujourd’hui » (modules déverrouillés aujourd’hui selon timezone Sprint).
    - Sidebar « Modules » (groupés par Jour X) + « Accès rapide » (callout 📌).
  - Page Module:
    - Contenu Notion épuré (sans “bande” d’intro).
    - Timeline verticale sticky (à droite), focus sur l’étape active, navigation par clic.
    - Barre sticky bas de page (Précédent / Suivant) — progression auto (✓) persistée en localStorage.
    - Headings du contenu renforcés (lisibilité / contraste).
- Workshops
  - Sync et rendu `/atelier` OK, dérivés de hubs.
- Gate/Access
  - Gating SSR conservé; overlay cohorte ou mot de passe selon contexte.

## 2) Principes d’évolution

- Notion-first: éditorial et paramétrage dans Notion; le code applique rendu + règles d’accès.
- Progression hybride: locale (offline) d’abord, serveur ensuite (compte utilisateur).
- Déploiements incrémentaux: chaque lot améliore l’usage sans tout basculer d’un coup.

## 3) Étapes proposées (phases)

### Phase A — Finition UX Sprint (1–2 semaines)
- Sprint (accueil)
  - Compteur d’activités par module, CTA « Continuer là où j’en suis » (depuis stockage local).
  - Option « timeline par jour » (colonnes Jour 1/2/3). 
- Module
  - Timeline mobile (version compacte; affichage sous contenu).
  - Compteur de progression (x/y ✓) dans la timeline.
  - Raccourcis clavier ← → pour naviguer entre étapes.
- Notion
  - Harmoniser propriétés: `day` (Number), `order` (Number), `type` (Select), `duration` (Number), `widget` (Code), `summary` (Text).

### Phase B — Comptes utilisateurs & persistance serveur (2–3 semaines)
- Auth / Enrôlement
  - Auth simple (NextAuth: email-magic / Google) ou SSO (selon besoin).
  - Enrôlement Sprint (table `enrollments`), rôles: learner/facilitator/admin.
- Progression 
  - Enregistrer progression serveur: module/step status, timestamps.
  - Bouton « Continuer » sur `/sprint/[slug]` (serveur + fallback localStorage).
- API
  - `PUT /api/progress` (marquer step/module fait), `GET /api/progress?slug=...`.
- Données (proposition)
  - Vercel Postgres / Supabase: `users`, `enrollments`, `progress_steps`, `progress_modules`, `certificates`.

### Phase C — Évaluation & Certification (2–4 semaines)
- Évaluations
  - Quiz/Checklist avancés (widgets existants), scoring serveur.
  - Passage minimal requis par module/sprint.
- Certificats
  - Génération PDF + signature (certificat Sprint). 
  - Badge partageable (URL vérifiable).
- Feedback & remises
  - Zone d’upload / liens livrables (widget), validation facilitateur.

### Phase D — Animation & Équipe (2–4 semaines)
- Équipe
  - Équipes (team) par Sprint, tableaux de bord facilitateur (vue progression).
- Sessions live
  - Agenda (Google Calendar/Zoom) + rappel par email.
- Intégrations
  - Slack/Discord: notifications « module X unlocked », « équipe Y a terminé ».

### Phase E — Observabilité & Robustesse (continu)
- Sync & perfs
  - Revalidate automatique via QStash aux `unlockAt`. 
  - Logs structurés (pino), alerting (Sentry), audit 429/Notion.
- Sécurité
  - Rate-limit API `progress`, CSRF sur mutations, scopes par rôle.

### Phase F — Accessibilité & i18n
- A11y: contrastes, focus visibles, lecture d’écran (landmarks/nav), tailles sur mobile.
- i18n: `fr-FR` / `en-US` pour UI et formats date.

## 4) Modèle de données (serveur)

Proposition tables (Vercel Postgres / Supabase)
- `users(id, email, name, avatar_url, created_at)`
- `enrollments(id, user_id, sprint_slug, role, created_at)`
- `progress_modules(id, user_id, sprint_slug, module_slug, status, started_at, completed_at)`
- `progress_steps(id, user_id, sprint_slug, module_slug, step_id, status, completed_at)`
- `certificates(id, user_id, sprint_slug, score, issued_at, public_hash)`

Statuts: `status = pending|in_progress|done`.

## 5) API (briques)
- `GET /api/progress?sprint=<slug>` → état modules+steps pour l’utilisateur.
- `PUT /api/progress` → payload `{ sprint, module, stepId?, status }`.
- `POST /api/enroll` → rejoindre un sprint (admin/modération optionnelle).
- `POST /api/certificates` → générer un certificat si conditions remplies.

## 6) Tâches imminentes (sélection)

- UI
  - Timeline mobile compacte + pourcentage ✓.
  - CTA « Continuer » sur `/sprint/[slug]` (lecture localStorage → plus tard serveur).
  - Countdown live (client) sur modules verrouillés.
- Notion
  - Ajouter `day` (Number) sur Modules si absent.
  - Vérifier `order` sur Activités partout; renseigner `duration` quand pertinent.
- Tech
  - Préparer schéma `progress_*` (SQL) + endpoints `GET/PUT /api/progress`.
  - Brancher NextAuth (ou simple JWT) et protéger les endpoints.

## 7) Garde‑fous
- Pas de fuite de contenu: modules verrouillés ne livrent pas les activités.
- Compat hubs: aucun changement ne doit casser `/hubs` et ateliers.
- Test UX: mobile d’abord, reduire charge cognitive (sidebar/timeline sobres).

## 8) Indicateurs de succès
- Progression moyenne par sprint (modules/étapes complétés).
- Taux de complétion, temps médian par module.
- Satisfaction (NPS simple), charge support.

---

Si tu veux, je peux créer la base `progress_*` (SQL) et les handlers d’API `GET/PUT /api/progress` dans un prochain lot, ou dérouler d’abord la « timeline mobile » + « CTA Continuer » côté client.
