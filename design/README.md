# Design Shotgun — Notion Publisher / Impulsion Front

Trois directions concrètes, toutes respectant `DESIGN.md` (tokens OKLCH, signature jaune rare, callouts sans stripe, 1-2 gradients max, pas de reflex fonts).

Fichiers :
- [`variant-a-broadsheet.html`](./variant-a-broadsheet.html)
- [`variant-b-studio.html`](./variant-b-studio.html)
- [`variant-c-specimen.html`](./variant-c-specimen.html)

Chaque variante rend la **même page marketing home** (header + hero + section "pourquoi" + CTA strip) pour comparer à iso-contenu. Light + dark supportés via `@media (prefers-color-scheme: dark)`.

---

## Grille comparative

| | **A · Broadsheet** | **B · Studio** | **C · Specimen** |
|---|---|---|---|
| **One-liner** | Magazine éditorial, rythme journal | Product studio moderne, grotesque discipliné | Typographic, bold, signature forte |
| **Inspirations** | Shape Up, Every, Bloomberg Businessweek | Vercel, Cal.com, Resend, Linear | Campsite, Rauno's work, editorial specimens |
| **Display font** | Source Serif 4 (Adobe, free, opsz variable) | Bricolage Grotesque (Google, variable, free) | Kalnia (Google, free, distinctive serif) |
| **Body font** | Geist | Bricolage Grotesque (même famille) | Host Grotesk |
| **Mono** | Geist Mono | JetBrains Mono | Commit Mono |
| **Neutral** | Warm paper 85° chroma 0.006 | Cool-grey 85° chroma 0.004 | Warm cream 85° chroma 0.015 (plus saturé) |
| **Accent intensité** | Rare — underlines, dots, pullquote edge only | Modéré — CTA + indicators + pullquote | **Fort** — CTA + nav active + callout solid + strip entière |
| **Radius** | 2/4/10/16 (mixte) | 4/8/12/18 (arrondi) | 0/2/4 (brut) |
| **Shadow** | Élégants classiques | Élégants modernes | "Stamp-like" (offset 2-6px, noir) |
| **Personnalité** | "Je suis sérieux comme un journal." | "Je suis un outil bien pensé." | "Je suis un spécimen typographique." |
| **Risque** | Peut paraître corporate/daté si mal dosé | Peut sembler "encore un SaaS" si on n'y met pas l'âme | Clivant — adoré ou rejeté |
| **Maintenance** | Moyenne (2 familles) | Faible (1 famille) | Moyenne (2 familles + styles éditoriaux) |
| **Compatibilité contenu Notion long** | ⭐⭐⭐⭐ (idéal lecture) | ⭐⭐⭐⭐ (lisible, dense) | ⭐⭐⭐ (la serif italique peut fatiguer sur 30min) |
| **Compatibilité marketing impact** | ⭐⭐⭐ (discret) | ⭐⭐⭐⭐ (équilibré) | ⭐⭐⭐⭐⭐ (impact max) |

---

## Critères de choix

### Choisis **A · Broadsheet** si…
- Tu veux que la lecture longue (apprenants, articles de blog) soit le cas d'usage prioritaire.
- Tu aimes l'idée d'un outil qui "ressemble à un journal premium" — section-head avec filet 2px haut, dropcap sur le 1er paragraphe, eyebrow mono, dates en capitales.
- Le jaune doit être presque caché — il apparaît sur hover d'un lien, sur le edge d'une citation, dans le CTA primary. C'est une ponctuation.

### Choisis **B · Studio** si…
- Tu veux le compromis optimal : marketing efficace + lecture long confortable.
- Une seule famille typographique (Bricolage Grotesque) à maintenir — variable font, weight 300-800, optical size 12-96.
- Le jaune a sa place claire : CTA, active nav indicator, stat highlight, callout-icon. Rare mais intentionnel.
- C'est la variante qui pose le moins de risques sur les 3 cibles (marketing/hub/learning).

### Choisis **C · Specimen** si…
- Tu veux que tes prospects retiennent visuellement Impulsion après 3 secondes.
- Tu assumes un parti-pris typographique fort : Kalnia italic dans la nav, drop-cap déguisée en guillemet XXL, CTA strip **ENTIÈREMENT** jaune, nav active en bloc jaune.
- Tu acceptes que sur 30min de lecture dans les pages learning, le contraste soit plus fatigant que A/B.
- Identité immédiate garantie. Risque : plus difficile à tempérer quand Notion te balance du contenu long qui ne respire pas la même énergie.

---

## Ma recommandation

**B · Studio** — pour Impulsion et son cas d'usage réel (marketing public + lecture longue apprenants), c'est le meilleur ratio impact/confort. Bricolage Grotesque en variable font te donne du caractère dans les titres et de la lisibilité dans le corps. Le jaune a sa place claire sans tout envahir. La maintenance d'une seule famille font est un atout quand on sait à quel point le projet est déjà chargé en CSS (1347 lignes globals.css).

**Si tu veux plus d'identité**, C · Specimen te donne un look qu'on reconnaît en 1 seconde — mais tu devras accepter que les pages Notion-rendered (qui constituent 80% du trafic utilisateur logué) soient un peu plus "chargées" visuellement.

**Si tu veux plus de sobriété**, A · Broadsheet est le moins surprenant — il ressemble à plein de sites premium éditoriaux, donc immédiatement "légitime", mais moins immédiatement "toi".

Un mix B + accents C marcherait aussi (ex : Bricolage comme sur B, mais avec un CTA strip jaune full-bleed comme sur C) — dis-le-moi si tu veux que je produise un D.

---

## Note technique

Les 3 variantes partagent :
- Hero background = **1 gradient radial subtil** (règle respectée : max 2 gradients dans le projet)
- Callouts **sans border-left coloré** (3 interprétations : A=background accent, B=flat surface-1 avec icon colorée, C=block solid avec borders top/bottom)
- Link card = **seul composant avec lift hover autorisé** (translateY -1px ou translate -2,-2 pour C)
- Focus ring 3px accent
- `prefers-reduced-motion` strict
- `prefers-color-scheme: dark` support
- Zéro reflex font (Outfit banni)
- Aucune blob animée, aucun noise/vignette

Swapper A → B → C côté code = **changer ~10 CSS variables + 2-3 tweaks de callout/btn**. Le framework est stable.
