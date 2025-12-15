# Refonte UI des hubs & pages Jour

Objectif : rapprocher l'expérience du LMS Notion de la maquette produit (landing + page Jour 2) tout en restant pilotée par Notion, avec un design épuré, lumineux et cohérent avec l'identité Impulsion.

---

## 1. Référence design – ce qu'on vise

### 1.1. Landing “Kit d’innovation IA”

- **Typo display forte** : gros titres en capitales partiellement, graisse 700, interlignage compact.
- **Palette épurée** : fond crème très clair, jaune chaud pour les accents, texte principal presque noir.
- **Rythme** : alternance de sections pleine largeur + cartes centrées avec beaucoup d’air.
- **Composants récurrents** :
  - Badges (eyebrow) pill : fond pastel + texte uppercase serré.
  - Hero card avec capture produit encadrée.
  - Grille de 3–4 cartes avantages, chiffres clés, témoignages.

### 1.2. Page Jour 2 (LMS)

- **Header de jour** : grande carte blanche arrondie avec :
  - “Jour 2” + sous-titre, à gauche.
  - Statut du jour (badge “Jour terminé”) à droite.
- **Section vidéo** : carte large (vidéo YouTube) avec label type “Vidéo explicative”.
- **Section “Objectifs du jour”** :
  - Titre de section + eyebrow.
  - Bloc de texte d’intro + liste d’objectifs numérotés.
- **Section “Guide pratique”** :
  - Titre de section + eyebrow.
  - Liste d’étapes, chacune avec :
    - pastille numérotée,
    - titre + description,
    - durée indiquée.
- **Section “Assistant IA”** :
  - cartes pour “Outils recommandés” (Perplexity, etc.) et prompts optimisés (accordéons).
- **Barre de progression / navigation** :
  - timeline verticale (ou horizontale) pour les steps,
  - barre fixe en bas “Jour précédent / Jour suivant”.

---

## 2. Base actuelle – ce qu’on a déjà

### 2.1. Tokens & styles globaux

Fichier : `src/app/globals.css`

- Palette déjà proche : background soft crème, primary vert/jaune, accent orange.
- Typo :
  - `--font-text` = Inter/Manrope,
  - `--font-display` = Space Grotesk (utilisée pour h1/h2/h3).
- Utilitaires :
  - `.btn`, `.btn-primary`, `.btn-ghost`,
  - `.surface-card`, `.surface-hero`,
  - `.eyebrow`, `.lead`.

### 2.2. Layout & navigation

- `src/components/layout/PageSidebar.tsx` :
  - sidebar premium avec sections “Accès rapide” + “Jours disponibles” par semaine,
  - gestion `releasedDays` (jours débloqués), `moduleQuickGroups` (Sprint).
- `src/app/(site)/[...slug]/page.tsx` :
  - pages hubs classiques (Notion Blocks + StartToday),
  - pages “Jour” virtuelles (learningPath.days) avec :
    - entête Jour (déjà passé en carte),
    - `ActivityContent` (contenu d’activité),
    - `StepTimeline` (colonne droite),
    - `StepNavBar` (barre sticky bas).

### 2.3. Composants de contenu Notion

Fichier : `src/components/notion/Blocks.tsx` + UI :

- `SectionTitle` : titre de section + eyebrow + description.
- `InfoCard` : cartes callout riches (variants : info, exercise, success, warning, ai, etc.).
- `Accordion`, `StepItem`, `MediaFrame`, `PullQuote`, `TodoBlock`, embeds (YouTube, Tally, etc.).
- Déjà un `normalizeText` utilisable pour reconnaître des headings spéciaux.

### 2.4. Composants learning

- `StepTimeline` (timeline verticale, mode “numbers” déjà utilisé côté Sprint).
- `StepNavBar` (nav bas de page, avance/recul + marquage done dans localStorage).
- `ActivityContent` (rendu Notion pour une activité donnée).

---

## 3. Cible design pour les hubs & jours

L’objectif : que chaque hub ressemble à une version “app” de la landing, et chaque jour à ta maquette Jour 2.

### 3.1. Hub root

Route : `/[hubSlug]` (ex. `/5jc`, `/test30`, `/challenge`).

- **Hero du hub** :
  - wrapper : `mx-auto flex w-full max-w-[1800px] flex-col gap-10 px-6 py-12 sm:px-12`,
  - card hero : `.surface-hero` avec :
    - eyebrow (type de programme : challenge, sprint, kit),
    - H1 du hub,
    - lead text (description du programme),
    - CTA principal “Commencer / Continuer le Jour X”, CTA secondaire “Voir le programme”.
- **Bandeau Aujourd’hui** (optionnel, si un jour est déverrouillé ce jour-là) :
  - look & feel inspiré de `SprintPage` (bandeau vert/jaune, modules du jour),
  - contenu : “Aujourd’hui : Jour N — Titre” + bouton “Ouvrir Jour N”.
- **Sections de contexte** (rendu par Notion) :
  - titres de sections rendus via `SectionTitle` + cards InfoCard/Surface.

### 3.2. Page jour virtuelle

Route : `/[hubSlug]/jXX` (et variantes cohortes `/[hubSlug]/c/[cohort]/jXX`).

- Header jour (déjà partiellement implémenté) :
  - carte arrondie (style `surface-card`) avec :
    - badge “Jour N” / “Semaine X”,
    - titre (H1/H2 selon contexte),
    - summary (1–2 phrases).
- Corps :
  - grille 2 colonnes :
    - **gauche** : `ActivityContent` de la step active, typographie type article (prose),
    - **droite** : `StepTimeline` mode `numbers`, sticky.
  - bas de page : `StepNavBar` (Précédent / Suivant).

### 3.3. Sections internes du jour (pilotées par Notion)

À l’intérieur des activités d’un jour (et/ou sur la page jour elle-même), on vise les blocs suivants :

- **“Objectifs du jour”** :
  - heading_2 ≈ `Objectifs du jour`,
  - sous-titre / paragraphe d’intro,
  - liste numérotée → `StepItem` ou `li` stylés (pastille numéro + texte).
- **“Guide pratique”** :
  - une liste d’étapes numérotées, avec durée (`X min`) optionnelle,
  - chaque étape peut être un callout “exercise” pour accentuer.
- **“Assistant IA”** :
  - callouts ou colonnes pour :
    - “Outils recommandés” (cartes avec logo + bouton “Accéder à l’outil”),
    - “Prompts optimisés” (listés ou en accordéons).
- **“Prompts optimisés”** :
  - heading_2 ≈ `Prompts optimisés`,
  - toggles Notion → `Accordion` avec bouton “Copier le prompt”.

---

## 4. Mapping Notion → UI (règles concrètes)

### 4.1. Détection de sections de jour

Dans `Blocks.tsx` :

1. Introduire une petite couche de “sectioning” :
   - parcourir les blocks, repérer les `heading_2` dont le texte normalisé matche :
     - `objectifs du jour`,
     - `guide pratique`,
     - `assistant ia`,
     - `prompts optimises` / `prompts optimisés`.
   - pour chaque heading détecté, regrouper les blocks jusqu’au prochain heading_2 en une section logique.
2. Pour chaque section logique, appliquer un rendu spécifique :
   - **Objectifs du jour** :
     - wrapper : card `.surface-card`,
     - header : `SectionTitle` avec eyebrow “Objectifs du jour”,
     - body : premier paragraphe comme intro, ensuite listes rendues avec une classe spéciale (numéros mis en avant).
   - **Guide pratique** :
     - header via `SectionTitle`,
     - chaque item de la liste numérotée rendu via `StepItem`,
     - si un callout avec durée (`5 min`) est présent, le passer à `StepItem`.
   - **Assistant IA** :
     - chaque callout coloré → `InfoCard` variant `ai` ou `info`,
     - boutons `[Lien → Outil]` transformés en CTA dans le footer de `InfoCard` si possible.
   - **Prompts optimisés** :
     - chaque toggle → item d’un `Accordion` (titre = titre du toggle, contenu = texte / code),
     - ajouter un petit bouton “Copier” sur les blocs de code.

### 4.2. Utilisation de `InfoCard` & variants

Règles simples :

- callout Notion `color: orange` → `variant: 'exercise'`, `layoutVariant: 'exercise'`,
- callout `color: green` → `variant: 'success'` (actions concrètes),
- callout `color: blue/purple` ou emoji 🤖 → `variant: 'info'` / `layoutVariant: 'ai'`,
- callout `color: gray` → `variant: 'neutral'` (notes).

La logique existe déjà via `resolveCalloutVariant` et `resolveCalloutLayout`; il s’agit surtout de les utiliser de façon plus systématique dans les sections “Guide pratique” & “Assistant IA”.

---

## 5. Ajustements design system

### 5.1. Typographie

Dans `globals.css` et `prose.css` :

- H1 : réduire un peu l’usage des uppercase, réserver l’uppercase aux eyebrows et labels, pas aux titres de contenu du LMS.
- H1/H2/H3 :
  - H1 ≈ `text-3xl` (30–34px), H2 ≈ `text-2xl`, H3 ≈ `text-xl`,
  - `font-display` (Space Grotesk), tracking légèrement négatif.
- Prose (`ActivityContent`) :
  - `font-size: 1rem–1.05rem`,
  - `line-height: 1.6–1.7`,
  - `color: text-muted-soft` pour les textes secondaires.

### 5.2. Cartes & surfaces

- S’assurer que :
  - header de Jour utilise `surface-card` + shadow léger,
  - sections “Objectifs / Guide / Assistant / Prompts” sont des `surface-card`,
  - les callouts `InfoCard` s’intègrent visuellement (radius, bordure, ombre) à ces surfaces.

### 5.3. Couleurs

- Garder la base actuelle (background crème + primary vert/jaune + accent ambre), mais :
  - utiliser le jaune/ambre principalement pour :
    - badges,
    - accents de bordures,
    - états “Jour courant / Jour terminé”,
  - limiter l’usage de grosses surfaces très colorées pour rester épuré.

---

## 6. Plan d’implémentation par étapes

### Étape 1 – Page Jour (technique déjà engagée)

1. Stabiliser la page jour virtuelle dans `src/app/(site)/[...slug]/page.tsx` :
   - carte header Jour,
   - grille `ActivityContent` + `StepTimeline` + `StepNavBar`,
   - vérifier le bon fonctionnement avec cohortes (`/c/`).
2. Ajuster le style (classes Tailwind) pour coller à la maquette Jour 2.

### Étape 2 – Hub root & bandeau Aujourd’hui

1. Étendre la branche “hub root” dans `[...slug]/page.tsx` :
   - ajouter une carte hero (avec `SectionTitle` ou un composant `<HubHero>` dédié),
   - afficher un résumé du programme + CTA.
2. Faire évoluer `StartToday` (ou créer un `HubTodayBanner`) :
   - calculer le “Jour du jour” via `unlockDate`,
   - reprendre le visuel du bandeau “Aujourd’hui” de `SprintPage`.

### Étape 3 – Sectioning de contenu Notion

Dans `Blocks.tsx` :

1. Ajouter une fonction `segmentSections(blocks)` qui renvoie une liste de sections logiques basées sur les `heading_2`.
2. Brancher cette segmentation sur le rendering des pages d’activités :
   - pour les headings “Objectifs du jour”, “Guide pratique”, “Assistant IA”, “Prompts optimisés”, utiliser un rendu custom (SectionTitle + card + sous-composants).
3. Garder un fallback générique pour le reste des headings afin de ne rien casser sur d’autres hubs/pages.

### Étape 4 – Assistant IA & Prompts

1. Sous la section “Assistant IA” :
   - mapper les callouts et listes vers `InfoCard` + liens CTA,
   - prévoir des styles cohérents pour les cartes d’outils (logo + bouton).
2. Sous “Prompts optimisés” :
   - transformer chaque toggle en item `Accordion`,
   - ajouter un petit bouton “Copier le prompt” pour les blocs code (optionnel mais très utile).

### Étape 5 – Finitions & cohérence

1. Harmoniser `PageSidebar` (labels, couleurs, états actifs) pour qu’il s’aligne avec le design général du hub.
2. Vérifier l’expérience sur :
   - `5jc/j01..j05`,
   - `test30` (21 jours),
   - `challenge` (nouveau hub).
3. Ajuster les spacing / tailles de police au besoin, sans toucher à la logique métier (cohortes, learning path).

---

Ce document sert de guide : à partir de maintenant, chaque nouvelle itération UI sur les hubs/jours devra respecter ces principes (structure, mapping Notion → blocs, cohérence avec Sprint) pour converger vers la qualité visuelle de ta maquette produit.**

