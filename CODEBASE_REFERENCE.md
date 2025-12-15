# CODEBASE_REFERENCE

_Commande initiale pour balayer le repo : `ls` (racine du projet)._

## A. TL;DR

- Routage principal : `src/app/(site)/[...slug]/page.tsx:28` assemble hubs, cohortes, jours virtuels et pages marketing à partir des bundles Notion stockés en KV et gère redirections / gating.
- Contenu Notion synchronisé hors requête via `src/app/api/sync/route.ts:49` (clients Notion + Cloudinary + QStash) puis persistant via `src/lib/content-store.ts:137`.
- Les pages marketing découpent les blocks par `splitBlocksIntoSections` et détectent des “presets” déclarés en code-block JSON (`src/app/(site)/[...slug]/page.tsx:576`) pour injecter `HeroSplit` et `LogosBand`.
- Le renderer Notion (`src/components/notion/Blocks.tsx:1`) mappe chaque block vers des composants typed et supporte widgets YAML via `renderWidget`.
- Apprentissage (hubs, sprints) repose sur les contrats `LearningPath`/`DayEntry` (`src/lib/types.ts:78`) et sur `ActivityContent` qui recharge les steps Notion à la volée (`src/components/learning/ActivityContent.tsx:28`).
- Gating privé repose sur un cookie `gate_key` issu du formulaire `/gate` (`src/app/gate/GateForm.tsx:6`) et vérifié avant chaque rendu (`src/app/(site)/[...slug]/page.tsx:126`).
- Le thème est piloté par les tokens CSS (`src/lib/theme/tokens.css:3`) relayés dans `globals.css` (`src/app/globals.css:3`) et peaufinés dans `src/styles/marketing.css:1`.
- Navigation & chrome client-side (`src/components/layout/Header.tsx:11`, `src/components/layout/PageSidebar.tsx:1`) s’adaptent automatiquement aux hubs (data-hub) et aux progressions.
- Assets Notion sont mirrorés vers Cloudinary si les secrets sont présents (`src/lib/cloudinary.ts:8`), sinon l’URL originale est conservée via `src/lib/media.ts:1`.
- Les widgets Brainstorm chargent des datasets JSON publics (`src/components/widgets/BrainstormDeckWidget.tsx:1` + `public/data/brainstorm/ideation.json:1`) pour fournir des decks interactifs.
- Observabilité limitée : on ne s’appuie que sur `@vercel/speed-insights` (`src/app/(site)/layout.tsx:5`) et des `console.*` côté sync, ce qui rend les régressions difficiles à diagnostiquer.

### Fichiers / dossiers “cœur”

1. `src/app/(site)/[...slug]/page.tsx:28` — moteur runtime unique qui choisit hub/marketing/challenge/learning et orchestre sections.
2. `src/app/api/sync/route.ts:49` — pipeline de synchronisation complet (pages, hubs, workshops, sprints, médias, recordMap hints).
3. `src/lib/content-store.ts:1` — API de lecture/écriture sur Vercel KV pour pages, index, workshops, sprints.
4. `src/components/notion/Blocks.tsx:1` — renderer universel de blocks + injections widgets/collections.
5. `src/lib/theme/tokens.css:3` — source de vérité des couleurs, rayons, ombres, échelles typographiques.

### Les 5 règles d’or (“ne pas casser”)

1. **Ne contournez pas `unstable_cache`** autour de `getPageBundle` et des index (`src/app/(site)/blog/page.tsx:10`, `src/app/(site)/hubs/page.tsx:10`). Sans ces caches, les pages SSR généreraient des centaines d’appels KV/Notion.
2. **Respectez la première section “preset”** : un bloc code JSON doit rester le tout premier item d’une section marketing (`src/app/(site)/[...slug]/page.tsx:576`). Toute insertion avant ce bloc empêchera l’injection des héros/logos.
3. **Toujours passer par `runFullSync`/`runSyncOne`** quand vous modifiez la structure des metas (`src/app/api/sync/route.ts:2428`). Les bundles en KV sont la seule source pour le runtime.
4. **N’ajoutez pas de state global côté serveur** : `Header` et `PageSidebar` sont client-only (`src/components/layout/Header.tsx:39`, `src/components/layout/PageSidebar.tsx:1`). Toute dépendance à `window` dans les composants serveur casserait le streaming.
5. **Gardez les tokens CSS synchronisés** entre `src/lib/theme/tokens.css:3`, `src/app/globals.css:8` et `src/styles/marketing.css:1` pour éviter des palettes divergentes entre marketing et learning.

## Si je ne devais lire que 10 fichiers

1. `src/app/(site)/[...slug]/page.tsx:28` — comprend toute la logique de routing dynamique, marketing presets et learning overlays.
2. `src/app/api/sync/route.ts:49` — décrit comment les données Notion sont normalisées, enrichies (recordMap, Cloudinary) et stockées.
3. `src/lib/content-store.ts:1` — montre le contrat exact des bundles (Page, Workshop, Sprint) et la dépendance à Vercel KV.
4. `src/components/notion/Blocks.tsx:1` — explique comment chaque block Notion est mappé côté UI, y compris les widgets personnalisés.
5. `src/lib/cohorts.ts:200` — détaille l’overlay des learning paths par cohortes (relative vs absolute scheduling).
6. `src/components/marketing/sectionUtils.ts:183` — illustre comment les en-têtes/lead sont extraits d’une section pour alimenter les presets.
7. `src/components/learning/ActivityContent.tsx:28` — montre le rendu d’une activité journalière (sections, fallback YAML, widgets).
8. `src/lib/theme/tokens.css:3` — donne la palette et les échelles qui irriguent tout le design.
9. `src/components/layout/PageSidebar.tsx:1` — termine l’UX hub/sprint (navigation, state, groupes dynamiques).
10. `src/app/gate/GateForm.tsx:6` — le modèle de gating (cookie, navigation) qui sécurise toutes les routes privées.

## B. Architecture globale

### Stack & runtime

- Next.js 15 App Router + React 19 + TypeScript strict (`package.json:1`, `tsconfig.json:2`), avec Turbopack actif via `npm run dev`/`build` (`package.json:6`).
- CSS piloté par Tailwind 4 (`postcss.config.mjs:1`) mais la majorité des tokens sont gérés manuellement via CSS custom (`src/app/globals.css:3`, `src/lib/theme/tokens.css:3`).
- Layout racine (`src/app/layout.tsx:1`) charge les polices Google, applique les tokens et enveloppe les sous-routes `(site)` (layout secondaire `src/app/(site)/layout.tsx:1` gère Header/Footer + Speed Insights).

### Arborescence commentée

- `src/app/(site)` — toutes les pages publiques/privées (home, hubs, blog, sprint, atelier) plus le catch-all (`src/app/(site)/[...slug]/page.tsx:28`) qui consomme les bundles KV.
- `src/app/api` — `sync` (worker + trigger) et `debug/*` pour inspection Notion (`src/app/api/sync/route.ts:49`, `src/app/api/sync/trigger/route.ts:6`, `src/app/api/sync/worker/route.ts:18`).
- `src/lib` — clients (Notion, Cloudinary, Cohorts), store KV (`src/lib/content-store.ts:1`), types (`src/lib/types.ts:10`), widgets parser (`src/lib/widget-parser.ts:1`).
- `src/components` — UI génériques (`src/components/ui/Heading.tsx:1`), layout (`src/components/layout/PageSection.tsx:1`), Notion renderer (`src/components/notion/Blocks.tsx:1`), marketing sections (`src/components/marketing/sections/HeroSplitSection.tsx:130`), learning widgets (`src/components/learning/ActivityContent.tsx:28`).
- `public/data` — datasets statiques pour widgets (ex : `public/data/brainstorm/ideation.json:1`).

### Diagramme texte

```
Notion DBs
   ↓ (runFullSync)            ┌─────────────┐
src/app/api/sync/route.ts →  │ Vercel KV   │ (`src/lib/content-store.ts:137`)
   ↓ revalidate/tag          └─────┬───────┘
                                   │
                            Page fetch (server)
                        `src/app/(site)/[...slug]/page.tsx:28`
                                   │
                     Section split & preset detection
                (`src/components/learning/sectioning.ts:13`
                 + `src/components/marketing/sectionUtils.ts:183`)
                                   │
                     Block rendering (`src/components/notion/Blocks.tsx:1`)
                                   │
                 Client shells (Header/PageSidebar/GateForm) +
                 CSS tokens (`src/lib/theme/tokens.css:3`)
```

## C. Routing & Pages

- **Groupes App Router** : `(site)` contient toutes les pages publiques/privées avec layout partagé (`src/app/(site)/layout.tsx:1`). Les routes spécifiques : `/` (`src/app/page.tsx:1`), `/gate` (`src/app/gate/page.tsx:1`), `/atelier/*` (`src/app/atelier/page.tsx:1` & `[slug]/page.tsx:1`), `/sprint/*` (`src/app/(site)/sprint/[slug]/page.tsx:1` + modules `src/app/(site)/sprint/[slug]/[moduleSlug]/page.tsx:1`), `/hubs/*` (`src/app/(site)/hubs/[slug]/page.tsx:1` + déclinaisons cohorte/jour).
- **Catch-all** : `src/app/(site)/[...slug]/page.tsx:28` gère tous les slugs restants (landings marketing, hubs alias, pages enfants) en déterminant slug, cohorte, jour virtuel, preset marketing, challenge layout, StartToday, StepWizard.
- **API routes** : `src/app/api/sync/route.ts:49` (sync full / one slug), `src/app/api/sync/trigger/route.ts:6` (QStash kickoff), `src/app/api/sync/worker/route.ts:18` (background job). Debug endpoints vivent sous `src/app/api/debug/*`.
- **Server vs client components** : toutes les pages sont Server Components (pas de `'use client'`), tandis que `Header`, `PageSidebar`, `GateForm`, widgets (`src/components/widgets/BrainstormDeckWidget.tsx:1`) optent pour `'use client'` quand ils manipulent le DOM/état.
- **Caching & revalidate** : fetch des bundles via `unstable_cache` sur chaque page (`src/app/(site)/blog/page.tsx:10`, `src/app/(site)/hubs/page.tsx:10`) avec tags (`page:slug`, `posts:index`, `hubs:index`) pour permettre `revalidatePath/Tag` depuis l’API de sync.

## D. Data & Intégrations

- **Notion API** : client unique (`src/lib/notion.ts:14`) + helpers pour récupérer blocks (`pageBlocksDeep`) et `queryDb`. `runFullSync` lit différents databases (`src/app/api/sync/route.ts:49`) grâce aux IDs en variables d’env.
- **Vercel KV** : stockage de tous les bundles/index via `kv` (`src/lib/content-store.ts:137`). `hasKv` (ligne 112) protège contre la configuration locale. Révocation/réhydratation s’opère via `setPageBundle`, `setPostsIndex`, etc.
- **Cloudinary** : `mirrorRemoteImage` (`src/lib/cloudinary.ts:49`) tente de reproduire les assets (avec caching KV, optional `image-size`). `lib/media.ts:1` délègue l’ensemble de la logique au module Cloudinary.
- **Notion recordMap** (optionnel) : `fetchRecordMap` (`src/lib/notion-record.ts:5`) permet de récupérer des hints (colonnes, boutons) utilisés pendant la sync (`src/app/api/sync/route.ts:881`).
- **Upstash QStash** : le trigger `GET /api/sync/trigger` signe et planifie un job (`src/app/api/sync/trigger/route.ts:6`), exécuté par `/api/sync/worker` avec vérification de signature (`src/app/api/sync/worker/route.ts:18`).
- **Datasets JSON** : certains widgets chargent des fichiers statiques (`BrainstormDeckWidget` -> `public/data/brainstorm/ideation.json:1`) via `datasetPath` (`src/components/widgets/BrainstormDeckWidget.tsx:28`).
- **Gestion d’assets** : Next Image autorise explicitement les domaines Notion/Cloudinary (`next.config.ts:4`), et `src/lib/notion-image.ts:1` est un hook pour modifier les URL à la volée.
- **Auth/tokens** : gating password-only via `gate_key` cookie (`src/app/gate/GateForm.tsx:6`) vérifié avant rendu (`src/app/(site)/[...slug]/page.tsx:126`). Pas d’OAuth ni de session côté serveur.

## E. Rendering “content-driven” (Notion / CMS / presets)

- **Pipeline complet** : Notion blocks → sync (`src/app/api/sync/route.ts:832`) → `PageBundle` KV (`src/lib/content-store.ts:18`) → fetch SSR (`src/app/(site)/[...slug]/page.tsx:57`) → sections (`src/components/learning/sectioning.ts:13`) → presets (`src/app/(site)/[...slug]/page.tsx:576`) → Notion renderer (`src/components/notion/Blocks.tsx:1`).
- **Types & mapping** : `NotionBlock` + `NavItem` + `DayEntry` viennent de `src/lib/types.ts:22`, garantissant que `PageSidebar` et `LearningHeader` reçoivent des données structurées.
- **Sections marketing** : `extractSectionHeader` supprime le heading/lead pour alimenter les presets (`src/components/marketing/sectionUtils.ts:183`), puis `renderMarketingSection` délègue à `HeroSplitSection` (`src/components/marketing/sections/HeroSplitSection.tsx:130`) et `LogosBandSection` (`src/components/marketing/sections/LogosBandSection.tsx:5`).
- **Règles hero/logos** : pour afficher un hero, la première section doit contenir un code-block `{"preset":"hero"}` — sinon `HeroSplitSection` n’est jamais invoquée (`src/app/(site)/[...slug]/page.tsx:770`). Les logos ne s’affichent que s’ils suivent immédiatement la section hero (`ligne 673`).
- **Rendering learning** : `ActivityContent` découpe les sections, active `renderMode="day"` et peut utiliser un YAML fallback via `parseWidget` (`src/components/learning/ActivityContent.tsx:28`, `src/lib/widget-parser.ts:1`). `StartToday` applique les règles de disponibilité (`src/components/learning/StartToday.tsx:1`).
- **Widgets & DB** : `Blocks` détecte les `embed`/`button` pour rendre des widgets (`src/components/notion/Blocks.tsx:5`) et transforme les `collection_view` en `NotionCollectionView` qui combine cache KV + fetch Notion (`src/components/notion/CollectionView/NotionCollectionView.tsx:1`).
- **Marketing shell** : `MarketingShell` (ligne 7) + `src/styles/marketing.css:1` imposent un ton visuel (sections tonales, columns Notion → flex).

## F. Design System & UI

- **Tokens & Globals** : palette/espace/radius définis dans `src/lib/theme/tokens.css:3` et injectés via `src/app/globals.css:8` (mappe vers `--background`, `--foreground`, etc.). Les utilitaires Tailwind sont consommés via `@theme inline` (`globals.css:30`).
- **Typographie & composants** : `Heading` applique la font display et la hiérarchie (`src/components/ui/Heading.tsx:1`), `Text` (non listé mais dans `src/components/ui/Text.tsx`) gère les variantes `lead/small`, `Eyebrow` pour les pill. `PageSection` impose une shell cohérente (padding, tones) (`src/components/layout/PageSection.tsx:1`).
- **Marketing CSS** : `src/styles/marketing.css:1` gère tonneaux, colonnes, dividers, tonality `data-tone`. À chaque preset (hero/logos), des classes spécifiques sont attendues (`.marketing-section[data-tone="accent"]`, etc.).
- **Layouts** : `Container` (`src/components/layout/Container.tsx:1`) normalise les largeurs; `MarketingHero` (`src/components/layout/MarketingHero.tsx:1`) encapsule l’entrée marketing. `FloatingLinesBackground` et `HeroFloatingLinesBackground` fournissent des effets visuels.
- **Règles pour nouveaux composants UI** : préférer les tokens existants (`--space-*`, `--r-*`), exposer les variations via props (cf. `Heading` / `PageSection`) et séparer la logique des styles (CSS fichiers vs JSX) pour rester aligné avec la stack Tailwind 4 + CSS modules.

## G. State, forms, i18n, analytics

- **State management** : aucun store global. Le peu d’état est local (`useState`) dans `Header` pour le menu (`src/components/layout/Header.tsx:39`), `PageSidebar` pour l’ouverture mobile/semaines (`src/components/layout/PageSidebar.tsx:1`) et les widgets client (`src/components/widgets/BrainstormDeckWidget.tsx:1`). Les pages/learning restent Server Components.
- **Forms / validation** : `GateForm` gère tout via `useState` + `router.push` (`src/app/gate/GateForm.tsx:6`). Les widgets formulaires (ex : `FormWidget`, `TabsFormWidget`) manipulent leurs propres validations via `renderWidget` (`src/components/widgets/renderWidget.tsx:1`). Pas de librairie de validation centralisée.
- **i18n** : aucune infrastructure. Tous les textes sont en français dans les components (`src/app/page.tsx:5`, `src/components/layout/Header.tsx:31`). Hypothèse : pas d’internationalisation prévue court terme.
- **Analytics / tracking** : seul `@vercel/speed-insights/next` est branché dans le layout `(site)` (`src/app/(site)/layout.tsx:5`). Pas de GA/Plausible/PostHog pour l’instant, malgré des docs dans `docs/quick-wins-implementation.md`.

## H. Qualité & Maintenabilité

- **Lint / format / typecheck** : scripts `npm run lint` (ESLint Next config) et `tsc --noEmit` implicite via build (`package.json:6`). ESLint flat config étend `next/core-web-vitals` (`eslint.config.mjs:8`). Strict TypeScript activé (`tsconfig.json:6`) avec `moduleResolution: bundler`.
- **Tests** : aucun test automatisé (pas de dossier `__tests__`, ni script `test`). Toute évolution critique doit être vérifiée manuellement (lint + preview). Risque élevé pour `runFullSync` et `[...slug]`.
- **Observabilité** : logs `console.log/warn` un peu partout (`src/app/api/sync/route.ts:845`, `src/lib/cloudinary.ts:71`). Pas de monitoring externe hormis Speed Insights. En cas d’échec sync, `notifySyncFailure` peut ping un webhook (`src/app/api/sync/route.ts:240` / `worker:107`).
- **Erreurs / patterns fragiles** : `hasKv()` retourne `null` silencieusement (ex : `src/lib/content-store.ts:137`), ce qui provoque des 404 silencieuses en local. Les redirections gating ne différencient pas erreurs 401/403 (juste `redirect('/gate?next=...')`), rendant le debug plus difficile.

## I. Zones à risque + recommandations

### Top 10 risques (avec preuves)

1. **Monolithe `[...slug]`** : plus de 800 lignes couvrant marketing, hubs, cohortes, challenges et StepWizard (`src/app/(site)/[...slug]/page.tsx:28`). Toute modification peut casser un mode invisible en review.
2. **Sync géante** : `runFullSync` + `syncPage` dépassent 2 700 lignes (`src/app/api/sync/route.ts:2428`). Difficulté à écrire des tests unitaires ou à isoler les régressions (médias, recordMap, workshops).
3. **Cloudinary obligatoire implicite** : si `CLOUDINARY_*` manque, on retombe sur les URLs Notion (`src/lib/cloudinary.ts:49`), mais sans instrumentation côté runtime; risque d’images expirées.
4. **Gating par cookie** : aucune signature, un simple `gate_key` comparé côté serveur (`src/app/(site)/[...slug]/page.tsx:126`). Un partage de lien avec `?key=` divulgue la clé en clair.
5. **Widgets SSR sensibles** : `BrainstormDeckWidget` manipule `localStorage` et datasets externes (`src/components/widgets/BrainstormDeckWidget.tsx:1`). Toute utilisation côté page server sans `'use client'` casserait l’hydratation.
6. **Rendering d’activités** : `ActivityContent` redemande une page Notion complète pour chaque step (`src/components/learning/ActivityContent.tsx:28`) → latence élevée lors d’un day avec plusieurs activités.
7. **Split de sections fragile** : on ne coupe que sur les `divider` Notion (`src/components/learning/sectioning.ts:13`). Si un auteur n’utilise pas de divider, tout le contenu se retrouve dans un seul panneau.
8. **Heuristique de header** : `extractSectionHeader` supprime des headings/paragraphs en fonction de leur position (`src/components/marketing/sectionUtils.ts:183`). Des blocks inattendus (synced, callout) peuvent effacer du contenu.
9. **KV optionnel** : `hasKv()` renvoie `false` sans fallback (`src/lib/content-store.ts:112`), rendant toute page dépendante de Notion live (non implémenté). Les pages 404 locales masquent de vraies erreurs de config.
10. **MutationObserver Header** : `Header` observe `data-hub` sur `<html>` (`src/components/layout/Header.tsx:55`). Si plusieurs composants manipulent l’attribut, les observers peuvent fuiter (pas de cleanup global).

### Refactors prioritaires (impact/effort)

| Catégorie | Recommandation | Impact | Effort |
| --- | --- | --- | --- |
| Quick win (≤2h) | Extraire les presets marketing dans un `switch` dédié + tests unitaires (vise `parsePreset` et `renderMarketingSection` `src/app/(site)/[...slug]/page.tsx:576`). | Réduit régressions sur héros/logos | Faible |
| Quick win (≤2h) | Journaliser lorsqu’on retombe en mode “fallback Notion URL” dans `mirrorRemoteImage` (`src/lib/cloudinary.ts:80`). | Débogage assets | Faible |
| Quick win (≤2h) | Ajout d’un script `npm run typecheck` + `npm run lint` dans CI (`package.json:6`). | Vitesse de feedback | Faible |
| Mid (1–2 j) | Scinder `[...slug]` en sous-composants (ex : `renderHubLayout`, `renderMarketingStack`) et déplacer la logique StepWizard dans un hook serveur. | Lisibilité + testabilité | Moyen |
| Mid (1–2 j) | Extraire `syncPage` / `syncHub` / `syncWorkshop` dans des modules séparés + ajouter des tests d’intégration (mocks KV). | Réduit risques sync | Moyen |
| Mid (1–2 j) | Introduire un service `GateService` centralisé (lecture/écriture cookie, validation) pour éviter la duplication (`src/app/gate/GateForm.tsx:6`, `src/app/(site)/[...slug]/page.tsx:126`, `src/app/(site)/sprint/[slug]/[moduleSlug]/page.tsx:12`). | Sécurité + maintenabilité | Moyen |
| Big (semaines) | Mettre en place un store persistant (Redis/Planetscale) pour remplacer KV si besoin multi-région + versionner les bundles. | Résilience data | Élevé |
| Big (semaines) | Ajouter un orchestrateur de tests E2E (Playwright) couvrant `/hubs/*`, `/sprint/*`, `/gate`. | Garantie non régression | Élevé |

## J. Glossaire

- **Preset** : convention “code block JSON” détectée via `parsePreset` pour choisir un layout (hero/logos) (`src/app/(site)/[...slug]/page.tsx:576`).
- **Learning Path / DayEntry** : structure décrivant les jours/steps d’un hub (`src/lib/types.ts:78`), potentiellement modifiée par une cohorte (`src/lib/cohorts.ts:200`).
- **Hub** : page Notion flaggée `isHub` côté meta, rendue sous `/hubs/*` (`src/app/(site)/hubs/[slug]/page.tsx:1`) avec `PageSidebar`.
- **Cohorte overlay** : adaptation des dates/jours selon un `CohortMeta` (relative/absolute) (`src/lib/cohorts.ts:200`).
- **Marketing Shell** : wrapper `<main class="marketing-page">` qui active le CSS dédié (`src/components/marketing/MarketingShell.tsx:7`, `src/styles/marketing.css:1`).
- **Gate key** : cookie + query param stockant la clé d’accès (`src/app/gate/GateForm.tsx:6`, validée dans `src/app/(site)/[...slug]/page.tsx:126`).
- **Widget** : contenu interactif défini via YAML/URL, rendu par `renderWidget` (`src/components/widgets/renderWidget.tsx:1`) avec des configs typées (`src/lib/widget-parser.ts:1`).
- **Section Shell** : conteneur `PageSection` qui applique padding, tones, panels (`src/components/layout/PageSection.tsx:1`).
- **RecordMap hints** : données extraites via la Notion unofficial API pour récupérer colonnes/buttons (`src/app/api/sync/route.ts:881`).
- **Brainstorm deck** : widget client qui pioche dans des datasets JSON (`src/components/widgets/BrainstormDeckWidget.tsx:1`, `public/data/brainstorm/ideation.json:1`).

## K. Annexes

### Variables d’environnement

| Variable | Emplacement | Rôle |
| --- | --- | --- |
| `NOTION_TOKEN` | `src/lib/notion.ts:14` | Auth API Notion. |
| `NOTION_PAGES_DB`, `NOTION_POSTS_DB`, `NOTION_HUBS_DB`, `NOTION_WORKSHOPS_DB`, `NOTION_SPRINTS_DB`, `NOTION_LEARNING_UNITS_DB`, `NOTION_LEARNING_ACTIVITIES_DB` | `src/app/api/sync/route.ts:49` | IDs des databases synchronisées. |
| `NOTION_COHORTS_DB` | `src/lib/cohorts.ts:9` | Base Cohortes (overlays LP). |
| `USE_RECORDMAP`, `NOTION_RECORDMAP_SHARE`, `NOTION_TOKEN_V2` | `src/lib/notion-record.ts:5` | Active le fetch recordMap (public/private). |
| `KV_REST_API_URL` / `KV_URL` | `src/lib/content-store.ts:112` | Accès Vercel KV. |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `src/lib/cloudinary.ts:8` | Mirroring média. |
| `CRON_SECRET` | `src/app/api/sync/route.ts:56` & `src/app/api/sync/trigger/route.ts:6` | Auth webhook / worker. |
| `QSTASH_TOKEN` | `src/app/api/sync/trigger/route.ts:7` | Auth client Upstash QStash. |
| `NEXT_PUBLIC_SITE_URL` / `VERCEL_URL` | `src/app/api/sync/trigger/route.ts:8` | Base URL utilisée par le worker. |
| `SYNC_FAILURE_WEBHOOK` | `src/app/api/sync/route.ts:57`, `src/app/api/sync/worker/route.ts:21` | Webhook d’alerte en cas d’échec. |

### Scripts npm (package.json)

- `npm run dev` / `build` / `start` — Next (Turbopack) (`package.json:6`).
- `npm run lint` — ESLint flat config (`package.json:6`, `eslint.config.mjs:8`).
- `npm run sync` / `sync:force` / `sync:prod*` — helpers `curl` pour déclencher `/api/sync/trigger` avec `CRON_SECRET` (`package.json:6`).

### Fichiers clés → rôle

| Fichier | Rôle |
| --- | --- |
| `src/app/(site)/[...slug]/page.tsx` | Route universelle (marketing + hubs + learning) et orchestrateur des presets. |
| `src/app/api/sync/route.ts` | Pipeline de synchronisation Notion → KV → tag revalidation. |
| `src/lib/content-store.ts` | Accès KV, format des bundles, index. |
| `src/components/notion/Blocks.tsx` | Renderer blocs (widgets, collections, databases). |
| `src/components/marketing/sectionUtils.ts` | Extraction header/lead pour presets. |
| `src/components/learning/ActivityContent.tsx` | Rendu des activités journalières avec fallback widget. |
| `src/components/layout/PageSidebar.tsx` | Navigation hubs/sprints (desktop/mobile). |
| `src/lib/cohorts.ts` | Overlay de learning path par cohorte, gestion fuseau/relative. |
| `src/lib/theme/tokens.css` | Source de vérité design system. |
| `src/components/widgets/renderWidget.tsx` | Factory centralisée pour widgets YAML/URL. |

## Règles de contribution

1. **Ajouter une nouvelle page marketing/hub** :
   - Créer/mettre à jour la page Notion avec les propriétés `slug`, `visibility`, `navigation`, `learningPath` selon `PageMeta` (`src/lib/types.ts:22`).
   - Ajouter un code-block JSON `{ "preset": "hero" }` si nécessaire pour piloter le layout (sinon, ce sera le layout par défaut) (`src/app/(site)/[...slug]/page.tsx:576`).
   - Lancer `npm run sync` (ou `/api/sync/trigger`) pour pousser le bundle dans KV (`src/app/api/sync/route.ts:2700`), puis vérifier via `/[slug]`.

2. **Ajouter un composant UI** :
   - Placer les primitives dans `src/components/ui` ou `src/components/layout` selon le scope; respecter les tokens (`src/lib/theme/tokens.css:3`) et la typographie (`src/app/globals.css:24`).
   - Exposer uniquement des props nécessaires et éviter `'use client'` sauf si DOM API obligatoire (ex : `Header` `src/components/layout/Header.tsx:39`).
   - Ajouter (si besoin) des styles globaux dans `src/app/globals.css` ou un fichier dédié (comme `src/styles/marketing.css`) plutôt que des `style` inline répétitives.

3. **Ajouter un nouveau preset marketing** :
   - Créer un composant dans `src/components/marketing/sections` (en s’inspirant de `HeroSplitSection` `src/components/marketing/sections/HeroSplitSection.tsx:130`).
   - Étendre `renderMarketingSection` (`src/app/(site)/[...slug]/page.tsx:755`) pour mapper le `preset`.
   - Ajouter les styles correspondants dans `src/styles/marketing.css` et, si besoin, adapter `extractSectionHeader` (`src/components/marketing/sectionUtils.ts:183`) pour extraire les champs requis.

4. **Ajouter un style global / token** :
   - Modifier `src/lib/theme/tokens.css:3` pour créer de nouveaux tokens, puis les relayer dans `src/app/globals.css:8` (`--background`, etc.).
   - Utiliser `@layer base`/`@layer utilities` pour éviter les conflits Tailwind (`src/app/globals.css:53`).
   - Tester l’impact sur les sections marketing (`src/styles/marketing.css:1`) et learning (classes `.content-panel`, `.section-band`).

