# Patterns de blocs Notion → Layouts premium Impulsion

Ce document complète `docs/callout-visual-system.md`.  
Objectif : réfléchir à **comment utiliser les blocs Notion comme un langage de mise en page**, pas seulement comme du texte mis en forme.

L’idée :  
> Notion sert d’interface auteur. Chaque bloc (callout, heading, toggle, todo, table, colonnes…) peut déclencher un **composant front premium** ou un **pattern de layout**.

---

## 1. Blocs cibles et rôle potentiel

On liste les blocs les plus utiles pour structurer visuellement une page.

### 1.1 Callout

Déjà documenté dans `callout-visual-system.md`.  
Résumé des usages :

- `gray` → Note neutre (`NoteCard`).
- `yellow` → Header de section / hero (`HeroSection`).
- `brown` → Étapes / timeline (`TimelineStep` + `TimelineGroup`).
- `orange` → Exercice / bloc d’activité (`ExerciseCard`).
- `blue` → Bloc IA / outil (`AIWidgetCard`).
- `green` → Résultat / tips (`ResultTipCard`).
- `purple` → Cadre théorique / méta (`TheoryNote`).
- `pink` → Exemples / story (`StoryCard`).
- `red` → Attention / anti-pattern (`WarningCard`).

> Idée clé : un callout n’est plus juste un encadré, c’est la porte d’entrée vers un composant de mise en page.

---

### 1.2 Headings (H1 / H2 / H3)

Rôles possibles :

- **Section anchors** : marquer le début d’une section, ancrage pour TOC, etc.
- **Hero triggers** : un H2 + un callout jaune juste après peuvent devenir un `HeroSection` connecté (titre H2 + description).
- **Sub-section badges** : H3 avec un préfixe (emoji ou token) peuvent se transformer en “eyebrow sections”.

Patterns possibles :

1. `H2` seul → titre de section standard.
2. `H2` suivi d’un `callout yellow` → `HeroSection` :
   - H2 = titre.
   - Callout = sous-texte + éventuellement CTA.
3. `H3` avec emoji spécifique (⭐️, 🎯) → `SectionBadge` (petit bandeau label avant le texte).

---

### 1.3 Toggles

Rôle :

- Contenu repliable (FAQ, détails avancés, annexes IA, etc.).

Usage potentiel :

- `toggle.color` + éventuel emoji / texte → type de contenu :
  - `gray` → FAQ minimal (`FaqItem`).
  - `blue` → “Détails IA” (`AIDetailsAccordion`).
  - `orange` → “Étape détaillée” (`StepDetails`).
  - `purple` → “Contexte théorique” (`TheoryAccordion`).

Patterns :

1. **FAQ section**  
   - Groupe de toggles `gray` sous un H2 → `FaqSection` (liste d’items accordéon).
2. **Annexes IA**  
   - Toggle `blue` directement après un bloc IA → détails/pro tip caché (`AIDetailsAccordion`).

---

### 1.4 Todos (to_do)

Rôle :

- Checklists, progression, validation d’étapes.

Usage potentiel :

- Suite de todos → `ChecklistCard` avec :
  - Barre de progression (x / n cochés),
  - Statut global (ex. “3/5 prérequis remplis”).
- Couleur optionnelle pour ton :
  - `green` → checklist “done / good practices”.
  - `red` → checklist “erreurs à éviter”.

Patterns :

1. **Checklist de validation**  
   - Tous les todos consécutifs → `ChecklistCard` compact, fond clair, big titre (“Checklist : avez-vous…?”).
2. **Checklist par section**  
   - Todo groupé sous un `callout yellow` ou un H2 → checklist locale d’une étape.

---

### 1.5 Tables

Rôle :

- Présenter des données structurées : KPIs, comparaisons, matrices, canevas.

Usage potentiel :

- Détecter des tables spécifiques (par structure ou par contexte) pour les transformer en gabarits :
  - Table 3 colonnes avec en-tête → `KPIBand` (3 chiffres clés).
  - Table 2 colonnes (label/valeur) → `SpecSheet` (liste de caractéristiques).
  - Table dans un callout vert/orange → `ExerciseMatrix` (tableau d’exercice).

Patterns :

1. **KPIs header**  
   - H2 + petite table 3 colonnes en dessous → bandeau de KPIs (cards avec gros nombres + labels).
2. **Spec sheet**  
   - Table 2 colonnes sans en-tête → liste de specs, borderless, avec icônes.
3. **Matrix d’atelier**  
   - Table 3–4 colonnes sous un `callout orange` → tableau de travail (ex. QQOQCP), stylé comme un mini outil.

---

### 1.6 Columns (column_list / column)

Rôle :

- Distribuer le contenu en grilles.

Usage potentiel :

- 2 colonnes : layout texte + visuel, ou “avant/après”.
- 3 colonnes : features, cards, comparatifs.
- Colonnes contenant des callouts colorés → pattern multi-cartes (ex. 3 cartes de type `ResultTipCard` côte à côte).

Patterns :

1. **Feature grid**  
   - 3 colonnes chacune avec un H3 + paragraphe → `FeaturesGrid`.
2. **Before/After**  
   - 2 colonnes, une avec callout `red` + l’autre `green` → `BeforeAfterLayout`.

---

### 1.7 Collections / Linked databases

Rôle :

- Listes de pages (posts, modules, hubs…).

Usage potentiel :

- Choisir un layout en fonction d’un meta (ou d’un callout de config à côté) :
  - `Posts` → `BlogCardGrid`.
  - `Hubs` → `HubGrid`.
  - `Modules` → `ModuleTimeline` / `ModuleGrid`.

Patterns :

1. **Learning path**  
   - DB de modules + meta = `StepTimeline` (jour par jour, module par module).
2. **Resource cards**  
   - DB de ressources (lecture, templates, vidéos) → `ResourceGrid` avec tags, durée, type.

---

## 2. Patterns transverses intéressants

Au-delà de “1 bloc → 1 composant”, certains patterns sont **multi-blocs** (séquences).

### 2.1 HeroSection (Chapter Hero)

**Source Notion**
- H2 (titre de section).
- Juste en dessous : callout `yellow` ou `purple` pour la description/CTA.

**Rendu**
- Fond sombre ou gradient marqué (navy + cuivré).
- Titre H2 24–28px, sous-texte 16px.
- CTA principal (btn primary) + CTA secondaire (ghost).
- Option : change le fond de la section suivante (section-alt).

---

### 2.2 Exercise + IA combo

**Source Notion**
- Callout `orange` (consigne).
- Callout `blue` juste après (prompt IA).

**Rendu**
- `ExerciseCard` en haut (consigne claire).
- `AIWidgetCard` juste en dessous, visuellement lié (bordure commune, bandeau partagé).
- Le front peut regrouper les deux dans un composant `ExerciseWithAI`.

---

### 2.3 Timeline de module

**Source Notion**
- Suite de callouts `brown` (étapes).
- Optionnellement un H2 avant (“Parcours du module”).

**Rendu**
- `TimelineGroup` + `TimelineStep` (rail, alternance gauche/droite, numéros).
- Plus tard : possibilité de coller des métadonnées (durée, type d’activité).

---

### 2.4 Story + Result

**Source Notion**
- Callout `pink` (story/exemple).
- Callout `green` (résultat/tip) ensuite.

**Rendu**
- StoryCard décalé, suivi d’un ResultTipCard, regroupés visuellement comme un “case study”.

---

### 2.5 Checklists finales

**Source Notion**
- Callout `yellow` (“Checklist finale”).
- Suite de todos (to_do).

**Rendu**
- `SectionHeader` (hero clair) + `ChecklistCard` avec barre de progression.

---

## 3. Vers un “Layout Engine” basé sur Notion

Idée globale :

- On garde `Blocks.tsx` comme orchestrateur :
  - Il lit la liste de `NotionBlock[]`.
  - Il repère des **patterns de blocs** (séquences, combinaisons).
  - Il route vers des composants dédiés.

Paliers d’implémentation :

1. **Callouts uniquement**  
   - Registry callouts (NoteCard, HeroSection, TimelineStep/Group, ExerciseCard, AIWidgetCard, etc.).
2. **Patterns simples autour des callouts**  
   - HeroSection (H2 + callout yellow).  
   - Exercise + IA (orange + blue).  
   - Checklist finale (yellow + todos).
3. **Tables / columns / toggles**  
   - KpiBand, SpecSheet, FeaturesGrid, FaqSection.
4. **Combos avancés**  
   - LearningPath, ResourceGrid, etc.

Ce document sert d’espace de réflexion :  
à chaque fois qu’on ajoute un composant ou un pattern, on le décrit ici avant d’implémenter, pour garder une vision d’ensemble du “langage visuel” de l’app.

