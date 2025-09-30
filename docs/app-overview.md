# Fonctionnement simplifié de l'application

Ce guide survole comment l’app transforme des pages Notion en site web statique dynamique.

## 1. Architecture générale

- Framework : [Next.js 15](https://nextjs.org/) en **App Router** (`src/app`).
- Rendu : chaque route est définie par un dossier contenant `page.tsx` (et optionnellement `layout.tsx`).
- Style : Tailwind CSS v4 est importé via `src/app/globals.css` et complété par des classes utilitaires.

## 2. Sources de données

- Les contenus viennent de Notion via le SDK officiel (`@notionhq/client`).
- Les identifiants des bases (pages et posts) ainsi que le token API sont lus dans les variables d’environnement :
  - `NOTION_TOKEN`
  - `NOTION_PAGES_DB`
  - `NOTION_POSTS_DB`

## 3. Récupération des données

1. `src/lib/notion.ts` expose trois fonctions :
   - `queryDb` pour interroger une base.
   - `pageBlocks` pour récupérer **récursivement** tous les blocs d’une page (colonnes, toggles, etc.).
   - `getPage` pour lire les métadonnées d’une page.
2. `src/lib/repo.ts` convertit les réponses Notion en objets métiers simples (`PageMeta`, `PostMeta`).

## 4. Routes principales

- `/` (groupe `/(site)`) : page d’accueil statique avec contenu éditorial.
- `/blog` : liste jusqu’à 50 posts Notion via `listPosts`.
- `/blog/[slug]` : affiche un article en récupérant blocs + métadonnées.
- `/[slug]` : pages Notion génériques (marketing, docs internes, etc.).
- `/gate` : formulaire client-side pour protéger les pages privées.

Toutes les pages Notion utilisent `revalidate = 300`, ce qui signifie :
- Le contenu est mis en cache 5 minutes côté serveur.
- Première visite : Next.js génère la page avec les données Notion, la met en cache, puis la réutilise tant que le cache n’a pas expiré.

## 5. Rendu des blocs Notion

- `src/components/notion/Blocks.tsx` reçoit un tableau de blocs et rend chaque type (paragraphes, headings, listes, callouts, colonnes, tableaux…).
- Les blocs imbriqués (`column_list`, `toggle`, `to_do`, etc.) sont gérés grâce à la récursion.
- Les styles inline (annotations Notion : gras, couleur) sont traduits en classes Tailwind via `annotationStyles`.

## 6. Gestion de l’accès privé

- Propriété Notion `visibility` :
  - `public` → la page est servie normalement.
  - `private` → la route `/[slug]` redirige vers `/gate` tant que l’URL ne contient pas `?key=xxx`.
- Si la propriété `password` est renseignée dans Notion, la valeur doit matcher la clé passée en query pour accéder au contenu.

## 7. Développement & commandes utiles

- `npm run dev` : serveur local (http://localhost:3000).
- `npm run build` : build de production (Turbopack).
- `npm run start` : servir le build.
- `npm run lint` : vérifier TypeScript / ESLint.

## 8. Déploiement

- L’app est prête pour Vercel ou tout hébergeur Next.js compatible.
- Pensez à définir les variables d’environnement (Notion + éventuels secrets) dans la plateforme de déploiement.

## 9. Ajustements rapides

- Changer la navigation : `src/app/(site)/layout.tsx` (tableau `navLinks`).
- Ajouter un nouveau type de bloc : étendre le `switch` dans `Blocks.tsx`.
- Modifier le temps de revalidation : ajuster `export const revalidate = 300` dans les pages dynamiques.

---
Mise à jour : 2025-02-14
