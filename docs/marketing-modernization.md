# Plan d’action – Shell marketing

> **Scope** : modifications spécifiques aux pages marketing rendues via `src/app/(site)/[...slug]/page.tsx`.  
> **Ne pas impacter** `/hubs`, `/sprint`, Learning / Challenge, etc.  
> S’assurer que tout comportement conditionnel contrôle `isMarketingPage` avant d’appliquer un nouveau style ou composant.

---

## 1. Audit Notion → Layout
- [ ] Cartographier les blocs Notion réellement utilisés sur les pages marketing (hero, logos, textes, callouts, column_list, toggle, divider…).  
- [ ] Identifier les patterns « block types » à styliser différemment (texte narratif, stats, CTA, témoignages, grilles).  
- [ ] Définir des meta simple (ex. divider “## accent ##”) pour orienter le rendu, géré **uniquement** dans `page.tsx` (via `renderSplitBlocks` et `renderMarketingSection`).

## 2. Shell marketing
- [x] Simplifier le shell (`MarketingShell` + `marketing.css` reset complet).  
- [x] Nouveau système de tones (flat/accent/dark/highlight) déclenchés via `data-tone`. Alternance par défaut = flat/acent, mais tout est overrideable.  
- [x] Base CSS restructurée : sections → typo → colonnes → callouts → media/boutons → overrides logos.  
- [x] Ajouter classes utilitaires `tone="dark" | "highlight" | "stripe"` (CSS uniquement pour l'instant).  

## 3. Typographie & grid
- [x] Ajuster les `h1/h2/h3` marketing : tailles distinctes, line-height, letter-spacing (voir règles h2/h3 dans `marketing.css`).  
- [x] Définir des styles « lead » et « body » pour le premier paragraphe vs suivants.  
- [ ] Introduire grilles split (image + texte) à partir de `column_list` ou meta, en laissant `/hubs` intact → conditionner dans `renderSplitBlocks`.

## 4. Components transverses
- [ ] CTA premium : bouton + halo + gradient (déjà amorcé) → isoler dans une classe `.marketing-cta`.  
- [ ] Section stats : styliser `callout` ou `column_list` avec `card-flat`, polices monospaces.  
- [ ] Témoignages / cas clients : identifier `quote`/`callout` → appliquer un layout en carrousel léger (CSS).  
- [ ] Logos band : déjà fixé ; ne plus le toucher.

## 5. Palette & assets
- [ ] Verrouiller une palette marketing (ex. `#F7F1E8`, `#101118`, `#FFB949`).  
- [ ] Ajouter classes utilitaires pour badges/labels (eyebrow, tag).  
- [ ] Harmoniser les images/illustrations :  
  - Support pour 3D beige (fond neutre).  
  - Support pour noir/blanc (apply `filter` CSS).  
- [ ] Traiter `figure > img` : paliers de radius/ombres distincts selon section tone.

## 6. Micro-interactions
- [x] Ajouter animations au scroll (fade/translate) pour sections marketing : via classes CSS + `prefers-reduced-motion`.  
- [x] Boutons : état hover/focus + ripple subtil. (✅ pseudo `::after` + outline)  
- [ ] Cartes : micro-hover dépendant du niveau d’élévation.

## 7. Dividers & navigation
- [x] Styliser les `divider` Notion en bandeaux fins (typo « Section suivante »).  
- [ ] Option : sticky mini-nav (à condition de n’être présent que sur `isMarketingPage`).  
- [ ] Vérifier `scroll-margin-top` pour Hn.

## 8. Performance & QA
- [ ] Tester pages marketing principales (campus, lab, studio) sur desktop/tablette/mobile.  
- [ ] S’assurer que les styles `.marketing-page` ne fuient pas (inspecter via DevTools).  
- [ ] Sur `/hubs` et `/sprint` : aucune régression visuelle.  
- [ ] Lighthouse : surveiller CLS (à cause des ombres/animations) et taille CSS.

## 9. Documentation
- [ ] Rédiger guidelines Notion : comment structurer callouts, colonnes, divider meta.  
- [ ] Ajouter captures d’avant/après pour aligner produit/marketing.  
- [ ] Mettre à jour README interne (ou ce fichier) avec check-list QA.

---

### Notes techniques
- Les modifications doivent passer par `isMarketingPage ? <MarketingShell>{…}</MarketingShell> : …`.  
- Pour toute logique additionnelle (ex. meta Notion), conditionner dans `renderSplitBlocks` ou `renderMarketingSection`.  
- Garder `marketing.css` isolé ; ne pas retoucher `globals.css` sauf besoin critique partagé.

### Notion > Rendu marketing (rappels)
- **Tones** : ajouter un bloc `{"tone":"accent"}` (ou `flat|dark|highlight|stripe`) juste avant la section dans Notion pour forcer le rendu. Sans attribut, on alterne automatiquement flat / accent.  
- **Colonnes** : lorsqu’un bloc Notion définit une largeur (`style="width:40%"`), la CSS applique un ratio approché (25/33/40/50/60/66/75). Sans largeur explicite, la grille auto-fit reprend la main.  
- **Callouts** :  
  - `yellow` → format pédagogique (bande latérale).  
  - `blue` → témoignage/citation (fond sombre, texte clair).  
  - `gray` → checklist/stat plates (dashed border).  
  - `card` → surface blanche, sans ombre, idéale pour les features.  
  Utiliser la couleur Notion correspondante pour déclencher ces variantes.  
- **CTA final** : dernière section du document Notion = tone `dark` automatique (fond anthracite + bouton lumineux).  
- **Animations** : `marketing-section` applique un fade/translate. Les personnes avec `prefers-reduced-motion` reçoivent un rendu statique.
