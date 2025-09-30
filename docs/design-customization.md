# Guide de personnalisation visuelle

Ce document décrit où intervenir pour modifier rapidement l'apparence du site (couleurs, typographies, composants communs). Toutes les références sont relatives au dossier `src/`.

## 1. Palette, typographies et effets globaux

- **Fichier** : `src/app/globals.css`
- **À retenir** :
  - Les variables CSS (`--background`, `--accent`, etc.) définissent la palette thème clair/sombre. Modifiez-les depuis la section `:root` et `@media (prefers-color-scheme: light)`.
  - Les animations et effets de glow du fond sont gérés par les gradients dans la déclaration `body`.
  - Les utilitaires communs sont définis dans `@layer utilities`. Ajoutez vos propres classes utilitaires ici (ex. `surface-card`, `notion-columns`).

> Astuce : après modification, relancez `npm run dev` et vérifiez que les nouvelles couleurs offrent suffisamment de contraste.

## 2. Mise en page globale

- **Fichier** : `src/app/layout.tsx`
- Définit les métadonnées, applique les polices Geist (`next/font`) et encapsule le `<body>`.
- Pour changer la langue, les balises racine ou ajouter des scripts globaux, modifiez ce fichier.

## 3. Shell du site (header/footer)

- **Fichier** : `src/app/(site)/layout.tsx`
- Comprend :
  - Le dégradé de fond principal.
  - Le header avec navigation (`navLinks`).
  - Le footer avec texte par défaut.
- Pour ajouter un lien, modifiez le tableau `navLinks`. Pour changer la baseline, éditez les balises `<p>` correspondantes.

## 4. Composants de layout

- **Fichier** : `src/components/layout/Container.tsx`
- Utilisé pour aligner et limiter la largeur du contenu. Le `max-w-5xl` peut être adapté pour élargir ou resserrer le contenu.
- Vous pouvez créer d'autres composants (`Section`, `Card`, etc.) dans `src/components/layout/` et les utiliser dans les pages Notion si besoin.

## 5. Pages vitrines

- **Home** : `src/app/(site)/page.tsx`
  - Contient les sections “hero”, piliers, méthode. Ajustez le contenu statique ici.
  - Les classes Tailwind permettent d’ajuster l’espacement rapidement (`px`, `py`, `space-y`, `grid`, etc.).
- **Blog & Article** : `src/app/(site)/blog/page.tsx` et `.../blog/[slug]/page.tsx`
  - Mêmes principes avec des cartes et badges. Changez les styles Tailwind pour modifier l’apparence des cartes.
- **Gate (page d’accès privé)** : `src/app/gate/page.tsx`
  - Structure simple ; adaptez les couleurs/typographies pour rester cohérent.

## 6. Rendu Notion (contenu dynamique)

- **Fichier** : `src/components/notion/Blocks.tsx`
- C’est le coeur de la mise en forme des blocs Notion. Chaque type de bloc (`heading`, `toggle`, `callout`, etc.) possède un style dédié.
- Pour modifier l’apparence d’un type de bloc :
  1. Recherchez le `case` correspondant dans le `switch`.
  2. Ajustez les classes Tailwind ou la structure JSX.
- Les couleurs de texte inline (annotations Notion) sont mappées dans `annotationStyles`. Ajustez-les pour adapter la palette.
- Les colonnes s’appuient sur la classe utilitaire `.notion-columns` (cf. `globals.css`). Modifiez-la pour changer gap ou comportement responsive.

## 7. Bonnes pratiques

- Prévisualisez systématiquement les pages longues contenant des colonnes, toggles, tableaux pour vérifier la cohérence.
- Évitez de multiplier les couleurs directes dans le JSX ; préférez définir de nouvelles variables CSS ou utilitaires.
- Gardez `npm run lint` propre pour détecter les oublis de classes/clés.

## 8. Aller plus loin

- Ajouter de nouvelles polices : utilisez `next/font` dans `layout.tsx` ou créez un Provider spécifique.
- Introduire des thèmes multiples : exposez vos variables CSS via des classes (`.theme-pro`, `.theme-light`) et appliquez-les à `<body>` selon vos critères.
- Créer un design system : centralisez les composants récurrents (boutons, badges, cartes) dans `src/components/ui/` et remplacez progressivement le JSX inline.

---
Mise à jour : 2025-02-14
