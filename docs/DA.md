FICHE TECHNIQUE DA – IMPULSION (V1)

Document de référence obligatoire avant toute évolution UI

1. Palette couleurs (tokens)
🌕 Ambre premium (accent principal)

--primary: #FFB300;

--primary-hover: color-mix(in srgb, var(--primary) 92%, white 8%);

--primary-contrast: #1A1A1A;

--primary-soft: color-mix(in srgb, var(--primary) 25%, white 75%);

🌫 Grilles / Lecture

--bg: #F4F4F4; (page background)

--bg-card: #FFFFFF;

--bg-soft: #FAFAFA;

🪶 Texte

--fg: #1A1A1A;

--fg-muted: #6A6A6A;

--fg-soft: #9B9B9B;

🟡 États

Success, warning, danger = déjà tokenisés → garder tel quel pour l’instant.

👉 Objectif : clair, chaud, professionnel, lisible

2. Typographie

Font : Outfit ONLY.

Scale
Niveau	Font	Weight	Size	Line-height
H1	Outfit	700	42px	1.1
H2	Outfit	600	30px	1.2
H3	Outfit	600	24px	1.25
Paragraph	400	18px	1.6	
Small	400	15px	1.5	

Guides rapides :

titres “denses”

corps “respirant”

lisibilité > style

3. Radius
Token	valeur
--r-s	6px
--r-m	12px
--r-l	18px
--r-xl	24px

Default = m

4. Hover & interactive

Hover = premium doux, jamais violent

Buttons/cards :

elevation : +2px

shadow: var(--shadow-m)

background soft → + 8% luminosité

transition : 200ms ease-out

5. Shadow system
Token	style
--shadow-s	0 2px 4px rgba(0,0,0,0.06)
--shadow-m	0 4px 10px rgba(0,0,0,0.08)
--shadow-l	0 8px 20px rgba(0,0,0,0.09)

Default pour cartes = shadow-m

6. Spacing (échelle)
Token	spacing
--space-xs	4px
--space-s	8px
--space-m	16px
--space-l	24px
--space-xl	40px
--space-2xl	64px

Rythme global :

vertical généreux

horizontal contenu

7. Buttons

Primary :

fond : --primary

texte : --primary-contrast

radius : --r-m

hover : --primary-hover

Secondary :

fond : --bg-card

border: 1px solid var(--primary-soft)

hover: soft + elevation

8. Cards

fond : --bg-card

radius : --r-l

padding : --space-l

shadow : --shadow-m

hover : + elevation + bg-soft

Always rounded
Always soft shadow
Always readable

9. Sections

fond page = --bg

section /= --bg-card

padding vertical : --space-2xl

container max = 1200px

10. Gradients (option premium)

Soft Amber

background: linear-gradient(
  180deg,
  color-mix(in srgb, var(--primary) 12%, white 88%) 0%,
  transparent 80%
);


Usage :

hero tiny accents

background section

NEVER behind long text

11. States

Focus visible:

outline 2px --primary

radius = --r-m

Active:

shadow-s

translateY(1px)

12. Principes pédagogiques (UX lecture)

largeur de paragraphe max : 70-80ch

marges verticales fortes

1 idée / paragraphe

éviter longues colonnes

"value : compréhension immédiate"

13. Références UI à imiter

Rally (Google) → tonalité jaune

Pitch → cards premium

Stripe Docs → lisibilité

Arc Browser → minimalisme moderne
