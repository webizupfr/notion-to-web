# Vue d’ensemble technique de l’application

Ce document donne une vision synthétique mais opérationnelle du fonctionnement de l’application. Il sert de base d’onboarding et de référence rapide pour développer, déployer et diagnostiquer.

— Dernière mise à jour : 2025-11-12

## 1) Stack & structure

- Framework: Next.js 15 (App Router) — `src/app`
- Langage: TypeScript — `tsconfig.json`
- Styles: Tailwind CSS v4 — `src/app/globals.css`
- Rendu: pages/segments `page.tsx`, layouts `layout.tsx`, `revalidate` géré par page + tags
- Dossiers clefs:
  - `src/app` routes (site, api, worker)
  - `src/components` UI, rendu Notion, widgets
  - `src/lib` intégrations Notion, KV, Cloudinary, parsing YAML, types
  - `src/types` types partagés

## 2) Concepts métiers

- Page: contenu générique depuis Notion, rendue sur `/(site)/[...slug]`
- Post: article de blog; index `/(site)/blog`, détail `/(site)/blog/[slug]`
- Hub: page pédagogique “parent” qui porte navigation, learning path, icône, etc.
- Workshop: “atelier” dérivé d’un hub (sous-ensemble de jours) — index `/atelier`, détail `/atelier/[slug]`
- Sprint: modules + activités avec déverrouillage absolu/relatif — index `/(site)/sprint`
- Cohorte: overlay des settings (ex: calendrier relatif) appliqué côté rendu

Types associés dans `src/lib/types.ts` et schémas YAML validés par Zod dans `src/lib/meta-schemas.ts`.

## 3) Données & stockage

- Source: Notion via SDK officiel `@notionhq/client` — `src/lib/notion.ts`
  - `queryDb()` interroge les databases
  - `pageBlocksDeep()` récupère récursivement tous les blocs (synced-blocks inclus)
  - `getPageMeta()` lit icône, cover, propriétés, `lastEdited`
- Optionnel: `notion-client` (record map) pour extractions avancées — `src/lib/notion-record.ts`
  - Activable via `USE_RECORDMAP=1`; privé possible via `NOTION_TOKEN_V2`
- Stockage applicatif: `@vercel/kv` (Upstash Redis) — `src/lib/content-store.ts`
  - Pages: `page:<slug>` → `{ meta, blocks, syncedAt }`
  - Index: `posts:index`, `hubs:index`, `workshops:index`, `sprints:index`
  - Bundles DB paginés (cache par curseur): `db:<databaseId>:cursor:<cursor>`
- Cache process (éphémère): `src/lib/cache.ts` (TTL mémoire)

## 4) Pipeline de synchronisation

Entrées Notion (via `.env`): `NOTION_PAGES_DB`, `NOTION_POSTS_DB`, `NOTION_HUBS_DB`, `NOTION_WORKSHOPS_DB`, `NOTION_SPRINTS_DB`.

Flux standard (asynchrone, sans timeout):
- `GET /api/sync/trigger` — `src/app/api/sync/trigger/route.ts`
  - Vérifie `CRON_SECRET`
  - Publie un job QStash vers `/api/sync/worker`
- `POST /api/sync/worker` — `src/app/api/sync/worker/route.ts`
  - Vérification de signature QStash
  - Appelle `runFullSync()` ou `runSyncOne(slug)` depuis `src/app/api/sync/route.ts`
- `runFullSync()` — `src/app/api/sync/route.ts`
  - Récupère hubs/pages/posts (+ workshops/sprints si configurés)
  - Transforme en `PageMeta`/`PostMeta`/indices; récupère `blocks` via `pageBlocksDeep`
  - Écrit dans KV (bundles, index) et invalide via `revalidateTag`/`revalidatePath`
  - Gère images (miroir Cloudinary si besoin) et enfants de databases

Déclencheurs utiles (voir `package.json`):
- `npm run sync` (local) → `curl http://localhost:3000/api/sync/trigger?secret=$CRON_SECRET`
- `npm run sync:prod` (+ `:force`)

## 5) Lecture & rendu côté site

- Pages génériques: `src/app/(site)/[...slug]/page.tsx`
  - Lit `getPageBundle(slug)` via `unstable_cache` avec tag `page:<slug>`
  - Applique “gate” si `visibility=private` (query `?key=` ou cookie `gate_key`)
  - Injecte overlay de cohorte si `c/<cohort>` dans l’URL
  - Affiche sidebar si hub parent (navigation hiérarchique)
- Blog: index `/(site)/blog/page.tsx` (lit `posts:index`), détail `/(site)/blog/[slug]/page.tsx`
- Hubs, Workshops, Sprints: index/détail dans `src/app/(site)/*` et `src/app/atelier/*`
- Rendu des blocs: `src/components/notion/Blocks.tsx`
  - Support listes, callouts, toggles, tableaux, colonnes, médias, équations…
  - Collections Notion (views) via `NotionCollectionView` → `src/components/notion/CollectionView/NotionCollectionView.tsx`
  - Widgets YAML (code blocks) parsés par `src/lib/widget-parser.ts`

Politique de revalidation:
- `export const revalidate = 0` sur les pages, avec `unstable_cache` + tags (`page:<slug>`, `posts:index`, `hubs:index`, etc.)
- Le job de sync invalide les tags pertinents: rafraîchit les pages/index au prochain accès

## 6) Accès & sécurité

- Portes d’accès (“gate”): `src/app/gate/*`
  - Notion `visibility=private` + `password` → redirection vers `/gate` tant que `?key=` absente ou incorrecte
  - Mémorisation dans cookie `gate_key`
- Sync: `CRON_SECRET` vérifié; worker signé QStash (`@upstash/qstash/nextjs`)
- Images: miroir Cloudinary optionnel — `src/lib/cloudinary.ts`

## 7) Variables d’environnement (référence)

Sans exposer de valeurs, les clés attendues (voir `.env.local`) incluent:
- Notion: `NOTION_TOKEN`, `NOTION_PAGES_DB`, `NOTION_POSTS_DB`, `NOTION_HUBS_DB`, `NOTION_WORKSHOPS_DB`, `NOTION_SPRINTS_DB`
- KV/Redis: `KV_URL` ou `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- QStash: `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
- Site: `NEXT_PUBLIC_SITE_URL` (ou `VERCEL_URL` en fallback)
- Sync: `CRON_SECRET`, `SYNC_FAILURE_WEBHOOK` (optionnel)
- RecordMap (optionnel): `USE_RECORDMAP`, `NOTION_RECORDMAP_SHARE`, `NOTION_TOKEN_V2`
- Cloudinary (optionnel): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

## 8) Commandes npm

- `dev` lance Next.js avec Turbopack
- `build` build de production
- `start` sert le build
- `lint` ESLint
- `sync`, `sync:force`, `sync:prod`, `sync:prod:force` déclenchent le job QStash

## 9) Déploiement

- Cible: Vercel (recommandé) ou tout hôte Next compatible
- Prérequis: KV activé (Upstash), variables d’env ci-dessus, QStash configuré
- Images: `next.config.ts` autorise Notion/CDN/Cloudinary en `remotePatterns`

## 10) Ajustements fréquents

- Navigation/Chrome du site: `src/app/(site)/layout.tsx`, `src/components/layout/*`
- Nouveau type de bloc: étendre le rendu dans `src/components/notion/Blocks.tsx`
- Collections Notion: `src/components/notion/CollectionView/*` et `src/lib/db-render.ts`
- Temps de cache: ajuster `revalidate` et les tags dans les pages/`unstable_cache`

## 11) Pistes d’amélioration (proposées)

- Observabilité
  - Brancher Sentry/Logtail et métriques (latence Notion, taux d’images miroirs, taille bundles)
- Robustesse sync
  - Stratégie delta: ne resynchroniser que les pages modifiées (filtre `last_edited_time`)
  - Fine-tuning du parallélisme Notion (actuellement 4) et backoff 429
  - Retries Cloudinary et journalisation des “fallbacks” (échantillons déjà retournés)
- Données & validation
  - Normaliser les propriétés Notion via mapping configurable (au lieu d’heuristiques `findPropByName`)
  - Étendre Zod aux métadonnées de pages/posts
- Sécurité & accès
  - Centraliser la logique “gate” (hub/workshop/pages) et auditer les chemins alternatifs
  - Supprimer variables non utilisées (`GATE_SECRET` si obsolète) et aligner `SITE_URL`/`NEXT_PUBLIC_SITE_URL`
- Performance
  - Compresser/“trim” les bundles KV (supprimer champs inutiles, minifier rich text)
  - Mettre un TTL sur certaines clés d’index si pertinent
- DX/tests
  - Tests d’intégration de `runFullSync` avec mocks Notion
  - Storybook pour blocs Notion et widgets YAML

## 12) Fichiers à connaître (repères)

- API Sync: `src/app/api/sync/route.ts:2311`, `src/app/api/sync/trigger/route.ts:1`, `src/app/api/sync/worker/route.ts:1`
- Bundles/indices KV: `src/lib/content-store.ts:1`
- Rendu Notion: `src/components/notion/Blocks.tsx:1`
- Collections Notion: `src/components/notion/CollectionView/NotionCollectionView.tsx:1`
- RecordMap (optionnel): `src/lib/notion-record.ts:1`
- Blog index/détail: `src/app/(site)/blog/page.tsx:1`, `src/app/(site)/blog/[slug]/page.tsx:1`
- Pages génériques: `src/app/(site)/[...slug]/page.tsx:1`
