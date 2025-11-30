# Système visuel des callouts Notion → Front Impulsion

Ce document sert de référence pour implémenter un rendu **premium** des callouts Notion dans l’app Impulsion.

Objectif :  
> En choisissant une couleur de callout dans Notion, l’auteur déclenche automatiquement un **pattern de layout** côté front (timeline, section header, bloc IA, exercice, etc.) sans config supplémentaire.

---

## 1. Rappels techniques

- Côté Notion, on récupère :
  - `callout.color` (`"gray" | "brown" | "orange" | ... | "red" | "default"`)
  - `callout.rich_text` (contenu)
  - `icon` (emoji, optionnel)
- Côté front, on utilise déjà :
  - `resolveCalloutVariant(tone)` → `info | success | warning | danger | neutral | grey | exercise | connector`
  - `InfoCard` (composant JSX pour le rendu final)
- On va enrichir cette logique avec une **deuxième couche** :  
  `color → layoutVariant` (timeline, sectionHeader, exercise, etc.).

Pseudo-modèle :

```ts
type CalloutTone =
  | "gray" | "brown" | "orange" | "yellow"
  | "green" | "blue" | "purple" | "pink" | "red" | "default";

type LayoutVariant =
  | "note"
  | "timeline"
  | "exercise"
  | "sectionHeader"
  | "result"
  | "ai"
  | "theory"
  | "story"
  | "warning";
```

---

## 2. Palette de comportements par couleur

### 2.1 Gray – Note neutre (callout “normal”)

**Intention**
- Remarques, définitions, précisions.  
- C’est notre callout “par défaut”.

**Layout**
- Carte pleine largeur (dans la colonne de contenu).
- Fond blanc.
- `border: 1px solid #e5e7ea` (hairline).
- Radius `12px`.
- Aucun dégradé, style minimal.

**Header**
- Label optionnel : “Note”.
- Pas d’icône par défaut.

**Interactions**
- Hover très léger : border un peu plus contrastée, très petite ombre.

**Mapping**
- `tone: "gray"` → `layoutVariant: "note"` + `InfoCard variant="neutral"`.

---

### 2.2 Brown – Timeline / alternance gauche–droite

**Intention**
- Séquences d’étapes (“Étape 1 / Étape 2 / Étape 3…”).
- Idéal pour dérouler un process.

**Pattern de groupe**
- Un **groupe consécutif** de callouts `brown` est rendu comme une **timeline** :
  - Rail vertical central ou légèrement décalé.
  - Chaque callout se branche sur le rail (petit connecteur).
  - Alternance gauche/droite : bloc 1 à gauche, bloc 2 à droite, etc.

**Layout de chaque étape**
- Fond blanc/ivoire très clair (`#f8f5ef`).
- Barre latérale `brown`/cuivre (`#cfa97e`) + dot sur le rail.
- Radius `12px`.
- Ombre courte.
- Label ou numéro d’étape (“Étape 1”, “Étape 2…”) affiché près du dot.

**Interactions**
- Hover : légère translation, halo sur le dot, border accentuée.

**Mapping**
- `tone: "brown"` → par défaut `layoutVariant: "timeline"`.
- Si un seul callout `brown` isolé : le rendre comme une **carte process** standard (sans alternance).

---

### 2.3 Orange – Exercices / blocs d’activité

**Intention**
- Consignes à exécuter, questions d’atelier, tâches pratiques.

**Layout**
- Carte large, fond ivoire chaud (`#fefbf5`).
- Barre latérale orange/cuivre (`#d88a4d`).
- Radius `14px`, ombre courte.

**Header**
- Icône : check-list ou target.
- Label pill : “Exercice” ou “À faire”.
- Titre optionnel (première ligne du callout).

**Corps**
- Texte 14–15px, line-height 1.6.
- Possibilité d’ajouter une micro-stepper quand plusieurs callouts orange se suivent (option future).

**Mapping**
- `tone: "orange"` → `layoutVariant: "exercise"` + `InfoCard variant="exercise"`.

---

### 2.4 Yellow – Sections / breaks majeurs

**Intention**
- Marquer un **changement de section** / chapitre dans la page.
- Exemple : “À faire en équipe”, “Checklist finale”.

**Layout**
- Full-width band (dans la colonne de contenu, mais visuellement plus large).
- Fond ivoire chaud (`#fefcf4`) avec léger gradient.
- Bordure hairline.
- Radius plus grand (16px) pour se distinguer des autres blocs.

**Comportement spécial**
- Un callout `yellow` peut agir comme **section header** :
  - Il change le fond de la section suivante (ex. active une `section-alt`).
  - Il est suivi d’un léger divider (bande horizontale discrète).

**Header**
- Label : “Section”, “À faire en équipe”, etc. (dérivé du texte s’il existe).
- Icône : flag ou spark.

**Mapping**
- `tone: "yellow"` → `layoutVariant: "sectionHeader"` + `InfoCard variant="neutral"`, mais rendu en **bandeau**.

---

### 2.5 Green – Résultats / tips / “À retenir”

**Intention**
- Résultats attendus, bonnes pratiques, check finale.

**Layout**
- Carte fond très clair vert/ivoire (`#f2fbf7`).
- Barre latérale verte (`#2ca56b`).
- Radius `12px`.

**Header**
- Icône check-circle.
- Label “Résultat” / “À retenir”.

**Variantes**
- Mode “stacké” : plusieurs callouts verts consécutifs → liste verticale de tips.
- Mode “grid” (option future) : trois petits blocs côte à côte sur desktop.

**Mapping**
- `tone: "green"` → `layoutVariant: "result"` + `InfoCard variant="success"`.

---

### 2.6 Blue – IA / contenus opératoires

**Intention**
- Prompts IA, guides de formulation, contenus “outil”.

**Layout**
- Fond glassy blanc/bleu (`#f3f6ff`) avec gradient léger.
- Barre latérale bleu profond (`#3b5ccb`).
- Radius 14px, ombre un peu plus marquée.

**Header**
- Icône : logo IA (sparkle / bot).
- Label : “IA générative”.
- Actions à droite (slot boutons) : `Remplir un exemple`, `Copier le prompt`, etc.

**Corps**
- Texte légèrement plus compact, on peut mettre en avant certaines portions (codes, placeholders).

**Mapping**
- `tone: "blue"` → `layoutVariant: "ai"` + `InfoCard variant="info"`.

---

### 2.7 Purple – Cadre théorique / meta

**Intention**
- Explications de méthode, canevas conceptuels, “pourquoi on fait ça”.

**Layout**
- Carte sobre, fond très clair (`#f7f4ff`), barre latérale violette.
- Moins d’ombre, densité compacte.

**Header**
- Label “Cadre” ou “Théorie”.
- Icône discrète (book, brain).

**Mapping**
- `tone: "purple"` → `layoutVariant: "theory"` + `InfoCard variant="info"` (ou une variante dédiée).

---

### 2.8 Pink – Storytelling / exemples

**Intention**
- Cas concrets, anecdotes, témoignages, “exemple à suivre”.

**Layout**
- Carte légèrement décalée (ex. alignée à droite avec un tout petit offset).
- Fond : blanc avec légère teinte rose (`#fdf5f9`) très subtile.
- Barre latérale rose.

**Header**
- Icône quote.
- Label “Exemple”.

**Mapping**
- `tone: "pink"` → `layoutVariant: "story"` + `InfoCard variant="neutral"` avec apparence plus “editorial”.

---

### 2.9 Red – Risques / erreurs / pièges

**Intention**
- Avertissements, anti-patterns, choses à éviter.

**Layout**
- Bloc compact, fond blanc légèrement rosé (`#fef5f5`).
- Barre latérale rouge (`#d45050`).
- Radius `12px`, ombre modérée.

**Header**
- Icône warning/danger.
- Label “Attention” ou “À éviter”.

**Mapping**
- `tone: "red"` → `layoutVariant: "warning"` + `InfoCard variant="danger"`.

---

## 3. Logique d’implémentation (high-level)

### 3.1 Détection du layout côté Blocks.tsx

1. Récupérer la **couleur Notion** : `const tone = notionColorTone(block.callout.color)`.
2. Mapper vers un **layoutVariant** :

```ts
function resolveCalloutLayout(tone?: string | null): LayoutVariant {
  switch (tone) {
    case "gray": return "note";
    case "brown": return "timeline";
    case "orange": return "exercise";
    case "yellow": return "sectionHeader";
    case "green": return "result";
    case "blue": return "ai";
    case "purple": return "theory";
    case "pink": return "story";
    case "red": return "warning";
    default: return "note";
  }
}
```

3. **Groupes spéciaux** :
   - Timeline : série de callouts avec `layoutVariant === "timeline"` consécutifs → wrapper `TimelineGroup`.
   - Section header : un callout `layoutVariant === "sectionHeader"` → déclenche un fond de section différent pour les blocs suivants.

4. Pour chaque callout individuel, rendre `InfoCard` avec :
   - `variant` (info/success/warning/etc.) venant de `resolveCalloutVariant`.
   - `layoutVariant` passé en prop pour adapter le header/layout.

### 3.2 Responsiveness

- Sur mobile :
  - Timeline `brown` → on peut repasser en **liste verticale** simple (plus d’alternance gauche/droite) mais en gardant le rail et les dots.
  - Les section headers `yellow` restent full-width.
- Sur desktop :
  - On active l’alternance gauche/droite pour les timelines.
  - On peut envisager des grids pour `green` (tips) / `orange` (micro-exercices) plus tard.

---

## 4. Priorité de mise en œuvre

Pour un impact rapide, l’ordre recommandé :

1. **Gray / Orange / Blue / Green / Red**  
   - Notes, exercices, IA, résultats, warnings → ce sont les plus fréquents.
2. **Yellow (sectionHeader)**  
   - Pour rythmer les pages et changer le fond de section.
3. **Brown (timeline)**  
   - Timeline alternée gauche/droite pour les parcours.
4. **Purple / Pink**  
   - Cadre théorique + storytelling pour enrichir les pages existantes.

Ce doc doit rester la référence pour toute évolution du système de callouts (design + code).  
Lorsqu’on ajoute une nouvelle variante, la documenter ici avant de toucher au code.

