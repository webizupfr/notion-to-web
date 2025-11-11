# Widgets interactifs Notion ⇄ Front

Ce document décrit comment transformer un bloc de code Notion en composant interactif dans l’app Impulsion.  
Il récapitule l’implémentation actuelle (FormWidget) et les autres widgets possibles.

---

## 1. Principe général

1. **Côté Notion**  
   - Un bloc de code (`/code`) contient un petit manifeste en YAML (langage du bloc = “YAML” ou “Plain text”).  
   - Exemple minimal :  
     ```yaml
     widget: form
     title: Mes instructions personnalisées
     outputTitle: Instructions IA
     fields:
       - name: apropos
         label: À propos de moi
     template: |
       # {{outputTitle}}
       À propos de moi :
       {{apropos}}
     ```

2. **Sync**  
   - Le texte est stocké tel quel dans `bundle.blocks`. Aucune propriété Notion supplémentaire n’est requise.

3. **Côté Front**  
   - `Blocks.tsx` intercepte les blocs de type `code`.  
   - Si le contenu contient `widget:` ou que le langage est `yaml`, il est envoyé au parseur (`parseWidget`).  
   - Le parseur (`src/lib/widget-parser.ts`) utilise `js-yaml` pour retourner un objet typé (`WidgetConfig`).  
   - On rend le composant dédié (`FormWidget` aujourd’hui).

4. **Fallback**  
   - Si le YAML est invalide ou que `widget` est inconnu, on affiche le bloc de code brut (pas de crash).

---

## 2. Widgets disponibles

### 2.1 FormWidget (livré ✔️)

- **Notion**  
  - Bloc YAML comme ci‑dessus (`widget: form`, `fields`, `template`).  
  - `fields` devient un formulaire dynamique (autosave locale).  
  - `template` est rendu via `renderTemplate` (substitution `{{ variable }}`).

- **Front**  
  - Fichier : `src/components/widgets/FormWidget.tsx`.  
  - Fonctionnalités :
    - Autosauvegarde (`localStorage`) par clé (`slug::blockId`).  
    - Boutons « Générer » (affiche la preview), « Copier », « Télécharger .md », « Réinitialiser ».  
    - Design aligné avec la charte (fond, boutons, police).  
    - Prévisualisation masquée tant qu’on n’a pas cliqué sur « Générer ».

- **Workflow participant**  
  1. Remplit chaque champ.  
  2. Clique sur « Générer ».  
  3. Copie ou télécharge le texte généré.  
  4. Peut revenir plus tard : les champs sont pré-remplis.

---

### 2.2 Prompt template (livré ✔️)

- **Notion**
  ```yaml
  widget: prompt
  title: Prompt rapide (sans structure)
  template: |
    Rédige un Product Requirements Document pour une nouvelle fonctionnalité d’application mobile ({{typeApplication}}).
  placeholders:
    - name: typeApplication
      label: Type d’application
      hint: Ex. « app de livraison de courses », « app de fitness »…
  ```

- **Front**
  - Composant `src/components/widgets/PromptWidget.tsx`.
  - Zone de texte unique auto-sauvegardée; boutons « Copier » et « Réinitialiser ».
- **Usage** : le template est pré-rempli (avec éventuels `{{...}}`). L’utilisateur le modifie directement puis copie.

- **Workflow participant**  
  1. Remplit les champs (ex. type d’application).  
  2. Cliquer sur « Recomposer » actualise le prompt.  
  3. Ajuste éventuellement dans le textarea final.  
  4. Copie le prompt pour l’envoyer à l’IA.

---

### 2.3 Quiz interactif (livré ✔️)

- **Notion**
  ```yaml
  widget: quiz
  title: Ajuster un prompt flou
  question: Quelles corrections apporter en priorité ?
  options:
    - label: A
      text: |
        Ajoute : “Merci d’être plus détaillé et complet dans ta réponse. Et fais en sorte que ce soit professionnel.”
      feedback: |
        Pas tout à fait.
        Bonne intuition — tu sens qu’il faut améliorer la réponse, mais dire “sois plus complet” reste trop vague.
        Cadre plutôt ton prompt avec des paramètres précis.
    - label: B
      text: |
        Découpe le sujet en plusieurs prompts séparés, chacun portant sur un aspect différent.
      feedback: |
        Pas faux — décomposer une tâche complexe est une bonne approche.
        Mais pour être efficace, il faut aussi cadrer chaque sous-prompt avec des contraintes claires.
    - label: C
      text: |
        Augmente la température pour obtenir une réponse plus créative.
      feedback: |
        Ce n’est pas la priorité. La température agit sur la créativité, pas sur la précision. Commence par clarifier ton prompt.
    - label: D
      text: |
        Spécifie le secteur, la région géographique, la période analysée, les sources de données et le format attendu.
      feedback: |
        Exact ! Un bon prompt donne à l’IA un contexte clair, des contraintes précises et un format attendu.
      correct: true
  ```

- **Front**
  - Composant `src/components/widgets/QuizWidget.tsx`.
  - Affiche la question, 4 cartes de réponses, feedback contextualisé dès qu’on clique.
  - Persistant (l’option choisie reste sélectionnée tant qu’on ne réinitialise pas).

- **Workflow participant**  
  1. Lit les options (A/B/C/D).  
  2. Clique sur une carte → feedback apparaît (vert si correct, jaune si à retravailler).  
  3. Peut réinitialiser pour retenter.

---

### 2.4 Atelier Prompt visuel (livré ✔️)

- **Notion**
  ```yaml
  widget: image_prompt
  title: Construis ton prompt visuel
  sections:
    - id: sujet
      label: Sujet / contexte
      type: textarea
      placeholder: Persona, action, objectif…
    - id: typeVisuel
      label: Type de visuel
      type: chips
      options:
        - Problème ou situation
        - Solution ou concept
        - Cible / persona
        - Ambiance / vision
    - id: style
      label: Style / médium
      type: chips
      options:
        - Illustration digitale
        - Clay 3D pastel
        - Photographie réaliste
        - Flat design vectoriel
    - id: ambiance
      label: Ambiance & palette
      type: chips
      options:
        - Clair et professionnel, fond blanc
        - Chaleureux et inspirant, palette pastel
        - Futuriste & néon, ambiance cyberpunk
    - id: extra
      label: Détails supplémentaires
      type: textarea
      placeholder: angle de vue, éclairage, résolution…
  template: |
    Type de visuel : {typeVisuel}
    Sujet : {sujet}
    Style : {style}
    Ambiance : {ambiance}
    Détails : {extra}
  ```

- **Front**
  - Composant `ImagePromptWidget` (chips + zones libres, autosave, preview & copy).

---

### 2.4 TabsForm (nouveau ✔️)

- Notion
  ```yaml
  widget: tabs_form
  title: BUILD — B/U/I de ton assistant
  outputTitle: Assistant Blueprint (BUILD)

  sections:
    - id: b
      label: 🟡 B — Base Setup
      help: Donne une identité claire à ton assistant.
      fields:
        - name: assistant_name
          label: Nom de l’assistant
          placeholder: "Rôle + spécialité + 'Assistant' (ex. Content Strategy Assistant)"
        - name: short_description
          label: Description courte
          placeholder: "Qui il aide, sur quelle tâche, et pourquoi c’est utile"

    - id: u
      label: 🟢 U — Use Case Definition
      help: Cadre la mission et clarifie la réussite.
      fields:
        - name: user
          label: Qui (utilisateur principal)
          placeholder: "Toi, ton équipe, un client…"
        - name: goal
          label: Quoi (objectif / livrable)
          placeholder: "Ex. Synthèse claire en 3 points à partir de notes"
        - name: value
          label: Pourquoi (valeur ajoutée)
          placeholder: "Gain de temps, clarté, cohérence…"
        - name: frequency
          label: Fréquence / contexte d’usage
          placeholder: "Tous les jours ? Après réunion ? Chaque lundi ?"

    - id: i
      label: 🔵 I — Instructions & Behavior
      help: Décris comment l’assistant travaille et se comporte.
      fields:
        - name: tone
          label: Ton & personnalité
          placeholder: "Empathique et pro ; direct et concis ; pédagogue…"
        - name: principles
          label: Principes (toujours faire)
          placeholder: "Vérifie la consigne ; explicite les hypothèses ; propose 1 plan…"
        - name: process
          label: Processus de travail
          placeholder: "Étapes 1–2–3 ; critères qualité ; checks finaux"
        - name: outputs
          label: Format de sortie attendu
          placeholder: "Structure, sections, longueur, style, formats (Markdown/JSON…)"
        - name: never_do
          label: Interdits (ne jamais faire)
          placeholder: "Inventer des données ; exposer PII ; réponses vagues ; hallucinations…"

    - id: l
      label: 🧠 L — Learning
      help: Alimente la mémoire de l’assistant avec des sources fiables et des exemples réussis.
      fields:
        - name: knowledge_sources
          label: Sources et documents de référence
          placeholder: |
            Liste 5–10 items, un par ligne. Format conseillé :
            Titre — type (guide/processus/politique) — lien — points clés
            Exemple : "Guide de style éditorial — guide — https://… — ton, niveau de détail, interdits"
        - name: knowledge_highlights
          label: Points clés à mémoriser
          placeholder: |
            Résume chaque source en 1–2 puces. Garde l’essentiel : définitions, cadres, règles du métier.
        - name: sample_dialogs
          label: Exemples de conversations réussies (3–5)
          placeholder: |
            Utilise ce canevas, répété 3 à 5 fois :
            ---
            Contexte:
            Input utilisateur:
            Réponse attendue (résumé):
            Critères de réussite:

  template: |
    # {{outputTitle}}

    ## B — Base Setup
    - Nom : {{assistant_name}}
    - Description : {{short_description}}

    ## U — Use Case Definition
    - Utilisateur : {{user}}
    - Objectif / livrable : {{goal}}
    - Valeur : {{value}}
    - Fréquence / contexte : {{frequency}}

    ## I — Instructions & Behavior
    - Ton : {{tone}}
    - Principes :
      {{principles}}
    - Processus :
      {{process}}
    - Exigences de sortie :
      {{outputs}}
    - Interdits :
      {{never_do}}

    ## L — Learning
    - Sources/documentation :
      {{knowledge_sources}}
    - Points clés à mémoriser :
      {{knowledge_highlights}}
    - Exemples de conversations :
      {{sample_dialogs}}

    ---
    ## Prompt système
    ### Rôle
    Tu es {{assistant_name}}. {{short_description}}

    ### Contexte
    Utilisateur: {{user}}
    Objectif: {{goal}}
    Fréquence/contexte: {{frequency}}
    Valeur: {{value}}

    ### Comportement (toujours faire)
    {{principles}}

    ### Processus
    {{process}}

    ### Sortie attendue
    {{outputs}}

    ### Interdits (ne jamais faire)
    {{never_do}}

    ### Connaissances (sources)
    {{knowledge_sources}}

    ### Connaissances (points clés)
    {{knowledge_highlights}}

    ### Exemples de conversations réussies
    {{sample_dialogs}}
  ```

- Front
  - Composant `src/components/widgets/TabsFormWidget.tsx`.
  - UI à onglets (B/U/I/L), autosave, preview, copier, télécharger, réinitialiser.
  - Compteur d’avancement par onglet (ex. 2/5 champs remplis).
  - Générer activé à tout moment; la preview se met à jour.
  - Option: `previewFromHeading: "## Prompt système"` pour n’afficher que la partie “Prompt système” dans la prévisualisation.

---

### 2.5 BranchChoice (nouveau ✔️)

- Notion
  ```yaml
  widget: branch_choice
  title: Choisis ta mission
  question: Quelle mission souhaites-tu suivre après le Jour 7 ?
  options:
    - label: Mission A — Acquisition
      description: Focus sur la génération de leads et l’activation.
      href: parcours/mission-a-jour-08
    - label: Mission B — Contenu
      description: Publication multi-canal et recyclage de contenus.
      href: /parcours/mission-b-jour-08
    - label: Mission C — Produit
      description: Feedback utilisateurs, PRD et itérations rapides.
      href: parcours/mission-c-jour-08
    - label: Mission D — Ops
      description: Automatisations internes et reporting opérationnel.
      href: /parcours/mission-d-jour-08
  ```

- Front
  - Composant `src/components/widgets/BranchChoiceWidget.tsx`.
  - Persiste la sélection dans `localStorage` sous `branch_next_href::<currentDaySlug>`.
  - Affiche un bouton “Continuer →” vers l’URL choisie.

- Intégration avec la navigation
  - Le bouton “Suivant →” des pages Jour (fin d’étape) utilise la sélection si présente.
  - Fallback: lien vers l’étape suivante du jour, sinon vers le jour suivant de la Learning Path.

---

### 2.6 Checkbox (nouveau ✔️)

- Notion
  ```yaml
  widget: checkbox
  label: J’ai bien complété cette étape
  description: Coche cette case quand tu as terminé.
  default: false
  ```

- Front
  - Composant `src/components/widgets/CheckboxWidget.tsx`.
  - Case à cocher simple, persistée dans `localStorage` par bloc (`checkbox_state::<slug>::<blockId>`).
  - Style aligné sur les blocs “to-do”.

— Alternative: utiliser directement les blocs Notion « to-do » (voir rendu interactif ajouté) pour une checklist plus native.

---

## 3. Widgets à venir

| Widget | Préfixe Notion | Description | Implémentation front |
|--------|----------------|-------------|----------------------|
| **Template à trous** | `widget: template` | Zone de texte + variables détectées automatiquement (ex. `{Nom}`, `{Objectif}`) | Un composant `TemplateWidget` qui parse les placeholders et fournit des inputs + preview |
| **Scratchpad** | `widget: scratch` | Bloc “prise de notes” auto-sauvegardé, avec boutons “Copier” / “Télécharger” | Simple composant client (textarea + autosave) |
| **Quiz** | `widget: quiz` | JSON/YAML décrivant question, choix, réponse correcte, hint | `QuizWidget` (state local, bouton “Afficher l’explication”), stockage de la réponse pour progression |
| **Timer** | `widget: timer` | `duration` (ex : 20m), label | Offrir un minuteur simple (setInterval) pour les activités Focus |
| **Checklist** | `widget: checklist` | Liste de cases à cocher avec persistances | Permet de suivre les livrables du jour |

---

## 4. Développement futur

1. **Centraliser les widgets**  
   - Créer `src/components/widgets/index.ts` exportant une map (`{ form: FormWidget, quiz: QuizWidget, ... }`).  
   - `parseWidget` retourne `widget: 'form' | 'quiz' | …`.  
   - `Blocks.tsx` réduit à : `const widget = parseWidget(codeText); if (widget) return renderWidget(widget);`

2. **Validation & erreurs**  
   - Ajouter un composant `WidgetError` qui affiche un message (“Widget mal configuré”).  
   - Loguer les erreurs lors de la sync (`console.warn` déjà présent).

3. **Analytics / tracking**  
   - Hook facultatif pour envoyer un event (ex. `leverageTrack('form:generate', { slug, fieldCount })`).

4. **Sauvegarde multi-device (option)**  
   - Ajouter un endpoint API + KV/Supabase pour sauvegarder les données par user (ex. `POST /api/widget-progress`).  
   - Auth légère (mail + magic link) ou simple token.

5. **Toolkit auteur**  
   - Document Notion pour les auteurs (ex. `/docs/widgets`), avec snippets prêts à coller.  
   - Lint YAML (quick validator) côté front : si parsing échoue, afficher la raison (ex. `champ 'fields' doit être une liste`).

---

## 5. Points UX à surveiller

- Gérer l’ordre des widgets (pas trop rapprochés sans contexte).
- Ajouter un “Afficher/masquer” si le formulaire est long.
- Ajuster les CTA en fonction du type de livrable (Prompt → bouton “Copier le prompt”, Résumé → “Télécharger .txt”).
- Pour les quiz, prévoir un badge “✅ Correct” / “❌ Réessaye” + lien vers les ressources correspondantes.

---

## 6. Résumé

| Étape | Notion | Front |
|-------|--------|-------|
| 1. Ajouter un bloc code | YAML avec `widget: form` etc. | — |
| 2. Sync | Pas de config supplémentaire | `bundle.blocks` contient le texte |
| 3. Rendu | — | `Blocks.tsx` détecte `widget:` → `parseWidget` → composant |
| 4. Usage participant | Remplit les champs, génère, copie/télécharge | Autosave + preview conditionnelle |

La mécanique est prête pour tous les widgets basés sur un bloc code. À mesure que vous ajoutez de nouveaux besoins (quiz, timers, checklists…), on n’a qu’à définir le schema YAML et le composant React correspondant.
