# DESIGN.md — Notion Publisher / Impulsion Front

> Source of truth pour le design system post-refonte. Remplace/complète `tokens.css`, `globals.css`, `marketing.css`. Les composants consomment ces tokens ; ils ne hard-codent plus de couleurs, gradients, shadows ou spacings. Ce document est la référence au-dessus des plans de transition existants (`docs/Design System Transition Plan (premium Front).md`, `docs/design-refresh-plan.md`).

---

## 1. Diagnostic (pourquoi on refond)

### Ce qui marche
- Fondations techniques : tokens.css (30 vars), server-first, unstable_cache 60s, Speed Insights, `prefers-reduced-motion`, 30+ block types Notion mappés, pipeline Cloudinary.
- Skip link + focus 3px + main landmark : accessibilité de base solide.
- Separation of concerns : marketing / hubs / learning bien séparés.

### Ce qui casse l'ambition "premium front"
- **162 hex hard-codés** hors tokens — système contourné.
- **42 gradients** scattered (33 globals + 9 marketing) — chaque variante recrée son gradient.
- **5 callouts `border-left: 4px`** coloré — AI tell absolu.
- **Outfit** — dans la reflex-font banlist, feel SaaS 2023.
- **3 glassmorphism décoratifs** sur pills / flip-card / widget-surface.
- **10+ shadows arbitraires** au-delà des 3 tokens.
- **7 variantes info-card** chacune avec son gradient signature — aucun rythme.
- **Lift hover** sur 6+ classes → plus rien ne ressort.
- **three.js FloatingLines** non lazy — CLS + TBT sur landing.
- **Pas de dark mode système** (seulement `[data-tone="dark"]` manuel).

### L'angle de refonte
Passer de **"premium = empilement d'effets"** à **"premium = restraint chirurgical + typographie forte + signature jaune rare"**. La qualité perçue vient de la hiérarchie, pas des effets.

---

## 2. Principes (non-négociables)

1. **Notion devient UI** — le pipeline Notion→bundle→render produit du contenu qui a l'air conçu. Pas de rendu "défaut Notion" visible.
2. **Une seule voix visuelle** — marketing, hubs, learning consomment les mêmes tokens. Pas de palette distincte.
3. **Signature jaune rare** — le jaune amber est l'accent unique. Règle des 10 % : il apparaît dans les CTAs critiques, les pullquotes, les indicateurs d'état actif. Jamais en background de card, jamais en decoration.
4. **Hiérarchie par typographie** — contraste de poids/taille porte la structure. Les bordures colorées ne signalent pas l'importance.
5. **Lift reserved** — `translateY(-1px)` autorisé sur cards cliquables "principales" (hero cards, bookmarks, cartes d'index). Interdit sur callouts, pills, boutons, info-cards internes.
6. **Un gradient signature max** — le projet a droit à 1 gradient "atmosphère" (hero background subtle) + 1 gradient "moment" (CTA primary). Tout le reste est surface flat.
7. **Zéro AI slop** — voir §11.

---

## 3. Tokens (framework)

### 3.1 Couleur (OKLCH + yellow signature)

```
/* Neutrals — tinted vers amber hue 85° (chroma 0.005-0.010) pour cohésion brand */
--surface-0      : fond page (white tinted)
--surface-1      : cards, panels, sidebar
--surface-2      : hover, elevated
--surface-3      : popover, drawer

--text-primary   : titres, body strong
--text-secondary : labels, metadata, dates (AA minimum)
--text-tertiary  : placeholders, captions, disabled

--border-subtle  : dividers internes
--border-strong  : inputs, cards focusable, tables

/* Signature */
--accent              : yellow amber oklch(86% 0.17 92)
--accent-bg           : yellow très transparent (pour pullquotes, badges)
--accent-ink          : contrast text sur accent solid (dark neutral)
--accent-edge         : border exprimant le jaune (pour ring focus)

/* Signals — usage sémantique, pas décoratif */
--signal-success      : pour states "complété", "paiement reçu"
--signal-warning      : pour states "attention", "deadline"  (peut être le même que accent)
--signal-danger       : pour errors, overdue
--signal-*-bg         : versions 12% opacity pour backgrounds subtils

/* Shadows — 3 niveaux, pas plus */
--shadow-xs : 0 1px 2px 0 rgb(0 0 0 / .04)     inputs, boutons
--shadow-sm : 0 4px 12px -2px rgb(0 0 0 / .06)  cards
--shadow-md : 0 16px 32px -8px rgb(0 0 0 / .12) popover, drawer

/* Radius — ajusté pour un feel editorial */
--radius-xs : 2px   inputs, boutons compacts
--radius-sm : 6px   boutons, pills
--radius-md : 10px  cards, panels
--radius-lg : 16px  hero, images
```

**Light mode par défaut** (lecture diurne de contenu long), **dark mode supporté via `light-dark()`** pour l'app globale, non pas juste sur sections marketing.

### 3.2 Typographie

**Pairing** — à fixer par la variante choisie en Phase 3. Règles communes :

- **Display** : une fonte distinctive (non-reflex list) pour H1/H2 + eyebrow + pullquotes.
- **Body** : fonte de lecture, weight 400-500, optimisée pour contenu long (x-height haute, hinting propre).
- **Mono** : pour metadata (dates, tags, code inline, tabular numbers).

**Échelle modulaire (base 16px, ratio 1.25)**

```
--text-xs   : 13px  → captions, metadata, eyebrow
--text-sm   : 15px  → labels, small body
--text-md   : 17px  → body lecture (ligne ~68-72ch)
--text-lg   : 21px  → lead paragraphs, subtitles
--text-xl   : 28px  → h3
--text-2xl  : 36px  → h2
--text-3xl  : 48px  → h1 marketing (fluid clamp)
--text-4xl  : 64px  → hero (fluid clamp)
```

**Hauteur de ligne** : 1.55 body lecture, 1.1 headlines, 1.3 lg. Sur fond sombre, +0.05 (light weight effect).

**Tabular-nums** obligatoire sur dates, prix, stats, tableaux Notion.

**Cap à 65-72ch** sur body paragraphs.

### 3.3 Spacing (4pt)

```
--space-2xs : 4px
--space-xs  : 8px
--space-sm  : 12px
--space-md  : 16px
--space-lg  : 24px
--space-xl  : 32px
--space-2xl : 48px
--space-3xl : 64px
--space-4xl : 96px  → séparation entre sections marketing
--space-5xl : 128px → hero top/bottom
```

Règle : `gap` pour siblings, pas de margin-collapse.

### 3.4 Motion

```
--ease-out      : cubic-bezier(.16, 1, .3, 1)
--dur-fast      : 120ms   hover, focus
--dur-base      : 200ms   state change
--dur-slow      : 400ms   entrance (hero blocks, modal)
```

**Bannis** : bounce, elastic, durées > 500ms.

`prefers-reduced-motion: reduce` désactive :
- Tous les `transform` d'entrée (opacity seule conservée)
- Toutes les animations infinite (blobs, pulse, typing, bg-animations)
- Tous les lifts hover

### 3.5 Z-index

```
--z-base     : 0
--z-sticky   : 10   Header
--z-popover  : 40   FilteredSelect, tooltips
--z-drawer   : 60   PageSidebar mobile drawer
--z-modal    : 70   Command palette, media lightbox
--z-toast    : 80
--z-skip     : 100  skip link au-dessus de tout
```

---

## 4. Patterns — ce qui change

### 4.1 Callouts (refonte majeure)

**Avant** : `border-left: 4px solid var(--tone)` + background tinté + shadow-s + hover lift + hover bg shift.

**Après** : pas de stripe. Layout : icon + body, fond tinté subtil (4% de la signal color), pas de shadow, pas de hover lift.

```
.callout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  border-radius: var(--radius-md);
  background: var(--callout-bg);
  /* pas de border-left, pas de shadow, pas de hover transform */
}
.callout[data-tone="warning"] { --callout-bg: var(--signal-warning-bg); }
.callout[data-tone="success"] { --callout-bg: var(--signal-success-bg); }
```

Le signal passe par l'**icône colorée** (Lucide) + le **ton de fond**. Pas de stripe.

### 4.2 Info-card (rationalisation)

**Avant** : 7 variants avec 7 gradients hard-codés (hero, exercise, ai, theory, story, warning, result).

**Après** : 1 surface, 3 "modes" minimaux :
- `.info-card` — fond `surface-1`, pas de gradient, border-subtle
- `.info-card--hero` — seul qui a le droit au gradient signature (le 1er des 2 gradients autorisés)
- `.info-card--accent` — version jaune tinté quand on veut attirer l'oeil

Les anciens tones (exercise/ai/story/warning) deviennent des **variants typographiques + icon** à l'intérieur de la même surface, pas des cards séparées.

### 4.3 Boutons

**Avant** : `btn` + `btn-hero` coexistent, 2 systèmes.

**Après** : un seul `.btn`, 4 variants :
- `primary` : fond accent yellow, text accent-ink, **aucun gradient**, shadow-xs
- `secondary` : border-strong, fond surface-1, text primary
- `ghost` : transparent, text secondary, hover surface-2
- `link` : inline, underline animé on hover (existant OK)

Hauteur unique 40px (h-10), padding px-4, radius-sm. Pas de lift. Focus ring 3px accent.

### 4.4 Pills

Pas de glassmorphism. Surface flat avec border. Radius 999px. Un seul style.

### 4.5 Section band (refonte)

**Avant** : `.section-band::before` avec gradient lineaire brand+accent en 2px top.

**Après** : soit `.section-band` définit un fond de section (`bg-surface-1` ou `bg-accent-bg`), soit rien. Pas de gradient décoratif top.

### 4.6 Divider (refonte)

**Avant** : gradient horizontal + pill radial gradient au centre (very premium).

**Après** : simple `<hr>` 1px `border-subtle`, centered optional eyebrow text ("§" ou dot). Minimaliste.

### 4.7 Hero background (le seul gradient atmosphère autorisé)

Un unique gradient `radial-gradient` très subtil, stat, tint vers accent — SANS animation blob :

```css
.hero-bg {
  background:
    radial-gradient(800px 400px at 20% 0%, var(--accent-bg) 0%, transparent 60%),
    var(--surface-0);
}
```

Pas de noise + vignette layering. La texture vient du contenu, pas du fond.

### 4.8 Floating Lines three.js

**Décision** : à évaluer en Phase 3 — soit supprimé (si le hero gradient suffit), soit **dynamically imported + `prefers-reduced-motion` gated + `lg:` only** (pas sur mobile).

---

## 5. Migration (progressive)

Le projet est gros (1347 lignes globals.css + 47 client components). On NE refait PAS tout.

**Stratégie en 3 vagues**

**Vague 1 — Tokens + foundations** (Phase 5)
- Nouveau `tokens.css` OKLCH
- Nouveau `globals.css` mince (ne garde que layer base + focus ring + reduced-motion + skip link)
- Tailwind `@theme` étendu pour exposer les nouveaux tokens
- next/font : swap Outfit → nouveau pairing
- Ship sans casser : les classes CSS spécifiques legacy (info-card, btn-hero, section-band…) restent en place et continuent à fonctionner

**Vague 2 — Composants primitives** (follow-up)
- `.btn` unifié (supprime `btn-hero`)
- `.callout` refondu (pas de stripe)
- `.info-card` rationalisé (3 modes)
- `.pill` simplifiée

**Vague 3 — Nettoyage** (follow-up)
- Suppression classes legacy
- Audit final, re-run /audit

---

## 6. Briefs par page (/shape)

### 6.1 `/` (home marketing)

**Question** : "Qu'est-ce qu'Impulsion ?"

**Layout** :
- Hero : H1 large display + lead + 1 CTA primary yellow + 1 CTA secondary. Background : hero-gradient subtil. PAS de blob animé.
- Section "Pour qui" : 3 cards (apprenants / collectifs / écoles), font éditorial, pas de gradients internes.
- Section "Programmes" : grid d'extraits blog/sprints (typo éditoriale).
- Section "Preuves" : témoignages + logos. Typo > images.
- CTA final : strip full-width sur `surface-1`, centered.

### 6.2 `/hubs` / `/hubs/[slug]` (hub index + detail)

**Question** : "Où j'en suis dans mon parcours ?"

**Layout** :
- Page hub : PageSidebar refondue (progress, next/prev, CTA contextuel).
- Hero compact : titre hub + meta (durée, cohorte) + progress bar.
- Section "Prochaine activité" : 1 card héro cliquable (seule card avec lift autorisé).
- Section "Parcours" : liste éditoriale numérotée, pas cards-grid.

### 6.3 `/[slug]` (catch-all : marketing page ou day page)

**Marketing path** :
- MODE A : hero + section bands + CTA (marketing layout).
- Respecte les YAML presets existants mais les composants produits sont refondus.

**Day/learning path** :
- H1 + eyebrow (module) + meta (durée, progression).
- Sections Notion rendues avec patterns corrects : callouts, toggles, quotes, widgets.
- Sidebar progression + "Terminer le jour" CTA en footer.

### 6.4 `/blog` + article

**Question** : "Quoi lire ?"

**Layout** :
- Index : liste éditoriale (title + eyebrow + date + lead), PAS de card-grid avec image placeholder.
- Article : typographie éditoriale dominante, column centered, lead size, pullquotes (le SEUL usage de `.accent` sur texte).

### 6.5 `/gate` (auth simple)

Simplification : card unique centrée, input + CTA yellow, pas de gradients. Déjà proche.

---

## 7. Rendu Notion

Chaque block type a une règle :

- **paragraph** → `<p>` body lecture, max-width 72ch
- **heading_1** → H1 display, cap à 48px (pas de clamp fluide supérieur — c'est une content page, pas marketing hero)
- **heading_2** → H2 display, border-bottom-subtle 1px optional
- **heading_3** → H3 display
- **callout** → refondu §4.1 (pas de stripe)
- **toggle** → `<details>` avec summary surface-1 border-subtle, caret animé, pas de shadow
- **quote** → italic editorial, marge left 24px, border-left 2px `border-strong` (la seule exception à la règle anti-stripe, car sémantique "citation")
- **numbered_list_item** / **bulleted_list_item** → rendu natif, marker customisé (carré ou chiffre typographique)
- **code** → CodePanel avec syntax highlighting, fond surface-2, mono font
- **image** → MediaFrame avec `width`/`height` propres (pas de CLS), caption italic mono
- **bookmark** → LinkCard avec **1 lift hover autorisé** (main card cliquable)
- **table** → thead sticky si > 5 rows, `<th scope="col">` systématique, zebra via `:nth-child` très subtile
- **columns** → grid CSS existant, collapse 640px (ok)
- **divider** → simple hr §4.6
- **equation** → KaTeX
- **video / audio / embed / file** → MediaFrame unified

---

## 8. Accessibility (non-négociable)

- **Landmarks** : `<main>` (déjà), `<nav aria-label>`, `<aside>`, `<footer>` systématiques.
- **Skip link** : déjà présent ✓ — garder le `.skip-to-content` mais simplifier le style (pas de `box-shadow: var(--shadow-l)`).
- **Focus** : `:focus-visible` 3px accent (ok), offset 3px (ok).
- **Dialog pattern** : `role="dialog" aria-modal="true"` + focus trap obligatoire sur PageSidebar mobile drawer + Header mobile nav + media lightbox + future command palette.
- **Tables** : `<th scope="col|row">`, caption optional, `aria-labelledby` si besoin.
- **ARIA-live polite** sur toasts, résultats search.
- **Reduced motion** : désactive blob, pulse, infinity animations. Déjà partiel ✓.
- **Heading** : un seul `<h1>` par page. Si contenu Notion commence par h2, wrapper page fournit `<h1>` page title.
- **Contrast** : tous tokens text-* respectent AA minimum (4.5:1 normal, 3:1 large).

---

## 9. Performance

- **Images** : next/image partout où c'est maison. Pour NotionImage : `width`/`height` extraits du block Notion (ou image-size lib au sync), `sizes` attribute calibré.
- **three.js FloatingLines** : dynamic import + `prefers-reduced-motion` gate + viewport-observer (n'anime qu'en viewport) + `lg:` only. Sinon supprimé.
- **Blob animation** : supprimée. Le hero-gradient statique suffit.
- **`"use client"`** : audit ciblé sur Header, PageSidebar, Accordion, CodePanel, TodoBlock — server-ification si possible.
- **framer-motion** : respect existant, ne pas ajouter sans justifier.

---

## 10. Responsive

- **Container queries (`@container`)** : utiliser sur les widgets Notion (FlipCards, EvidenceBoard, BrainstormDeck) — ils doivent s'adapter à leur colonne.
- **Breakpoints viewport** : `sm: 640`, `md: 768`, `lg: 1024`, `xl: 1280`, `2xl: 1440`.
- **Mobile first** : layout base = mobile. Desktop = progressive enhancement.
- **Touch targets** : min 40px sur mobile (existing `h-12` `h-10` ok, vérifier pills + sidebar items).
- **Blob sur mobile** : supprimée globalement.

---

## 11. Anti-patterns — spécifiquement bannis

- ❌ `border-left: Xpx solid <color>` au-delà de 1px sur callouts / cards / alerts (exception : quote block, sémantique).
- ❌ Gradient text (`background-clip: text`).
- ❌ Plus de 2 gradients dans tout le projet (1 atmosphère + 1 CTA accent).
- ❌ Glassmorphism décoratif (backdrop-filter uniquement sur modal/lightbox overlay).
- ❌ Lift hover sur callout, pill, info-card, btn.
- ❌ Shadow > 32px blur.
- ❌ Hero-metrics layout générique (big number + small label × 4).
- ❌ Reflex fonts (Inter, DM Sans, Outfit, Plus Jakarta, Space Grotesk, Fraunces, Newsreader, Instrument Serif/Sans, Syne, IBM Plex, Cormorant, Lora, Crimson, Playfair).
- ❌ Purple-to-blue gradients, cyan-on-dark.
- ❌ Bounce/elastic easing.
- ❌ three.js non-lazy.
- ❌ Images sans `width`/`height`.

---

## 12. Variante à choisir (Phase 3)

Trois directions concrètes fournies dans `design/` — toutes respectent ce framework.

Elles diffèrent sur :
- le **pairing typographique** (toutes non-reflex)
- l'**intensité du contraste** (éditorial doux vs typographique fort)
- la **pondération du jaune** (accent rare vs accent plus visible)

Voir `design/README.md` pour la grille comparative et `design/variant-[a|b|c].html` pour les previews (même page marketing rendue 3 fois).
