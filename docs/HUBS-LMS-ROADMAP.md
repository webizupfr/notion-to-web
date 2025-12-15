# Roadmap – Passage au niveau “LMS SaaS” pour les hubs

Objectif : transformer l’app actuelle (renderer Notion propre) en produit LMS cohérent et premium, en utilisant Notion comme CMS de primitives et non plus comme simple page. Cette roadmap couvre **côté code** et **côté Notion**.

---

## 1. Vision cible

- **Expérience** : les hubs et pages Jour doivent ressembler à un vrai produit (comme le prototype Jour 3), avec :
  - des cartes bien structurées par section,
  - une typo maîtrisée (Outfit, titres très lisibles),
  - une hiérarchie claire entre “Objectifs”, “Guide pratique”, “Assistant IA”, “Livrable du jour”, etc.
- **Rôle de Notion** : servir de **langage de mise en forme** simple, avec quelques conventions, qui est ensuite transformé en composants React métiers.
- **Rôle du code** : parser les blocks Notion, reconnaître des patterns, les mapper sur des composants LMS typés (DayHeader, SectionObjectives, PromptAccordion, etc.) et gérer la progression (jour/étapes terminées).

---

## 2. Côté Notion – conventions, DBs et templates

### 2.1. Bases de données

Architecture cible :

- **DB JOURS** (`NOTION_LEARNING_UNITS_DB`)  
  - Chaque ligne = un jour du programme.  
  - Colonnes importantes :
    - `titre` du jour (ex. “Fais bosser l’IA pour toi”) → utilisé pour le header en haut de page.
    - `ordre` (1..n), `slug` (`j01`, `j02`…), `date_deblocage`, `unlock_offset` → déjà utilisés par le learning path.
    - relation vers le hub (`Hubs`) → pour associer le jour au bon programme.

- **DB ACTIVITÉS** (`NOTION_LEARNING_ACTIVITIES_DB`)  
  - Chaque ligne = une activité (page) rattachée à un jour.  
  - Colonnes importantes :
    - `jour` (relation vers DB JOURS),
    - `ordre` (1 = page intro, 2..n = étapes),
    - `type` (`Intro`, `step`, `conclusion`…) pour affiner le rendu si besoin.
  - Pour chaque jour, on a donc :
    - **Page 1** = Intro du jour,
    - **Page 2..X** = étapes de l’activité du jour (Step 1, Step 2…).

Le front reconstruit la page Jour en combinant le header issu de **DB JOURS** et les contenus découpés issus de **DB ACTIVITÉS**.

### 2.2. Template d’un Jour (structure multi‑pages)

Pour chaque **jour**, on vise le pattern suivant :

- **DB JOURS**  
  - Titre du jour = ce qui apparaît dans le header (ex. “Fais bosser l’IA pour toi”).  
  - Peut aussi contenir un résumé court (objectif global du jour) qui sera affiché sous le titre.

- **DB ACTIVITÉS – Page 1 (Intro du jour)**  
  Structure recommandée de la page Notion :
  - Bloc “Jour X sur X” (peut être un petit paragraphe ou un callout discret).
  - Bloc narratif d’introduction (plusieurs paragraphes, parfois un sous‑titre fort).
  - Section objectifs / outils, généralement sous forme de deux colonnes :
    - `Objectifs` du jour : 1–3 bullet points,
    - `Outils du jour` : liste des outils nécessaires (ChatGPT, Claude, NotebookLM…).

- **DB ACTIVITÉS – Pages 2..N (Étapes)**  
  Chaque page suit un pattern stable :
  - **Intro / contexte** :
    - un heading ou callout fort en haut,
    - éventuellement une image ou illustration.
  - **Section “À toi de jouer”** :
    - titre explicite,
    - liste d’actions à mettre en œuvre (bullet points, sous‑listes, callouts pour les prompts/formulaires).
  - **Section “Et maintenant ?”** :
    - paragraphe(s) de récapitulatif / conclusion,
    - éventuellement une transition vers l’étape ou le jour suivant (texte, CTA).

Ces structures ne sont pas rigides, mais **plus les activités respectent ce pattern, plus le rendu LMS sera naturel**.

### 2.3. Typologie de blocs par zone

Sans multiplier les contraintes, on peut préciser quelques attentes par zone :

- **Intro du jour (Page 1)** :
  - heading principal = titre narratif (fort, souvent en majuscules dans Notion),
  - paragraphes pour raconter “le pourquoi”,
  - callouts ou colonnes pour `Objectifs` / `Outils du jour`.

- **Pages d’étapes (Page 2..N)** :
  - intro/contexte : paragraphe + éventuellement callout/illustration,
  - “À toi de jouer” : titre + listes d’actions, callouts pour les prompts, formulaires, checklists,
  - “Et maintenant ?” : un simple paragraphe suffit, éventuellement un emoji ou une phrase de transition vers la suite.

### 2.4. Conventions de styles pour guider le rendu

Sans casser la liberté d’écriture, adopter quelques conventions :

- **Callouts** :
  - orange / emoji ✅, 📌 → exercices / actions clés,
  - bleu / emoji 🤖 → encarts Assistant IA,
  - gris → notes / contexte.
- **Toggles** :
  - sous “Prompts optimisés” uniquement → chaque toggle est un prompt.
- **Dividers** :
  - utilisés pour séparer des grandes respirations dans les pages jour (ces dividers pilotent déjà les sections côté front).

L’idée : ces patterns restent naturels pour toi dans Notion, mais permettent au code de reconnaître facilement les blocs et de les styler comme un produit LMS.

---

## 3. Côté code – architecture de rendu

### 3.1. Modes de rendu

Dans `ActivityContent` / `Blocks` (déjà commencé) :

- `renderMode="default"` : rendu générique Notion (blog, pages classiques).
- `renderMode="day"` : rendu LMS pour les jours de hubs :
  - multi‑cartes pour les sections (gradient crème, border douce, shadow),
  - typographie et spacing adaptés à la lecture d’un “cours”,
  - intégration avec la timeline de steps et la barre de navigation.

Action : continuer à traiter tous les contenus de jours via `renderMode="day"` comme c’est déjà le cas.

### 3.2. Parseur sémantique des sections (niveau 1)

Objectif : transformer les blocs Notion d’une activité en **sections typées** avant de les rendre.

Implémentation dans `src/components/notion/Blocks.tsx` (uniquement quand `renderMode="day"`) :

1. Segmenter les blocks en sections via :
   - les `divider` (déjà fait),
   - et/ou les `heading_2` (pour détecter les titres importants).
2. Pour chaque section, détecter son rôle via le texte du heading principal (en utilisant `normalizeText`) :
   - “video explicative”,
   - “objectifs du jour”,
   - “guide pratique”,
   - “assistant ia”,
   - “prompts optimises / prompts optimisés”,
   - “livrable du jour”,
   - sinon : `sectionGeneric`.
3. Créer une structure intermédiaire :

```ts
type DaySectionKind =
  | "video"
  | "objectives"
  | "guide"
  | "assistant"
  | "prompts"
  | "deliverable"
  | "generic";

type DaySection = {
  kind: DaySectionKind;
  heading?: string;
  blocks: RenderableBlock[];
};
```

4. Avant de rendre, mapper chaque `DaySection` vers un composant React adapté (cf. 3.3).

### 3.3. Composants métiers de section

Créer une petite couche de composants dans `src/components/learning/` :

- `DaySectionShell` (carte générique de jour) : déjà quasi présent via la card gradient, à factoriser.
- `SectionVideo` :
  - header avec label “Vidéo explicative”,
  - rend les embeds/vidéos avec `MediaFrame`/`YouTubeEmbed`,
  - optionnel : petit badge “Vidéo”.
- `SectionObjectives` :
  - header avec icône (emoji cible / checklist),
  - rend le premier paragraphe puis une liste d’objectifs numérotés, stylée (pastilles, spacing).
- `SectionGuide` :
  - header “Guide pratique”,
  - rend la liste principale en “étapes” visuelles (peut utiliser `StepItem` + temps estimé si trouvé).
- `SectionAssistantIA` :
  - deux sous‑colonnes possibles : “Outils recommandés” (callouts → `InfoCard`), “Prompts optimisés” (toggles → `Accordion`).
- `SectionDeliverable` :
  - header “Livrable du jour”,
  - image/illustration à gauche + texte/CTA à droite si la structure de blocks le permet; sinon fallback en carte simple.

Action : commencer par un ou deux composants (Objectifs + Guide) pour un hub pilote (`challenge`), puis généraliser.

### 3.4. Progression & UX LMS

Sans dépendre de Notion :

- Utiliser `StepTimeline` + `StepNavBar` pour :
  - marquer les steps comme “done” (déjà en partie via localStorage),
  - afficher clairement la progression dans le jour.
- Plus tard : stocker l’info dans une clé KV/Redis (optionnel) pour retrouver la progression entre devices.
- Sur la sidebar (`PageSidebar`), refléter la progression :
  - jour en cours vs jours terminés (icône check, couleur différente),
  - permettre un accès rapide au prochain jour disponible.

---

## 4. Plan d’implémentation par phases

### Phase 1 – Stabiliser la base actuelle (fait / à vérifier)

- [x] `renderMode="day"` branché sur `ActivityContent` pour les pages jour d’un hub.
- [x] Multi‑cartes de section avec gradient crème, border douce, shadow soft.
- [x] Typo Outfit partout, titres plus forts, StepNavBar & sidebar ajustées.

Vérifier simplement que l’expérience est stable sur : `/5jc/j01..j05`, `/test30/j06..j10`, `/challenge/j01..j05`.

### Phase 2 – Parseur de sections jour (structure métier)

1. Ajouter la structure `DaySection` dans `Blocks.tsx` (mode `day`).  
2. Implémenter la détection de `kind` en regardant le heading principal de la section (texte normalisé).  
3. Garder un fallback `kind: "generic"` qui réutilise le rendu actuel pour ne pas casser les anciens contenus.

### Phase 3 – Composants de sections clés

1. Créer `DaySectionShell` (card de base) si besoin ; sinon réutiliser le style déjà appliqué dans `Blocks` mais via un composant.  
2. Créer au moins :
   - `SectionObjectives` (pour “Objectifs du jour”),
   - `SectionGuide` (pour “Guide pratique”).  
3. Mapper `DaySection.kind` → composant dans le rendu `Blocks` (mode `day`) :
   - `objectives` → `<SectionObjectives blocks={...} />`,
   - `guide` → `<SectionGuide blocks={...} />`,
   - autres → `<DaySectionShell>{fallbackRender}</DaySectionShell>`.

Tester cette phase uniquement sur un hub pilote (`challenge`) pour ajuster le design sans impacter tout le monde.

### Phase 4 – Assistant IA & Prompts optimisés

1. Créer `SectionAssistantIA` :
   - repérer les callouts + liens vers outils,
   - les rendre avec `InfoCard` variant `ai` / `info`,
   - styliser comme une section “IA coach”.
2. Créer `SectionPrompts` (ou intégrer dans `SectionAssistantIA`) :
   - transformer les toggles sous “Prompts optimisés” en `Accordion` avec si possible un bouton “Copier” sur les blocs code.
3. Mapper `kind: "assistant"` / `"prompts"` vers ces composants.

### Phase 5 – Livrable du jour & raffinements

1. `SectionDeliverable` :
   - détecter l’image principale + texte + liens,
   - les disposer dans une card layout 2 colonnes (image / actions).  
2. Ajouter des petits détails LMS :
   - chip “Jour terminé” dans le header de jour si toutes les steps sont marquées done,
   - état “fait” visuel côté sidebar pour les jours terminés.

3. Ajuster finement les tokens (couleurs, ombres, rayons) pour s’aligner encore plus sur le prototype.

---

## 5. Organisation côté contenu (Notion)

Pour que le système fonctionne bien sans micro‑tuning constant :

1. Créer un **template de page “Jour”** dans Notion pour les nouveaux programmes :
   - avec les headings recommandés et quelques exemples de blocks (callouts IA, toggles prompts, etc.).
2. Documenter les conventions dans une page “Guide de rédaction” :
   - quand utiliser chaque heading,
   - comment formater les objectifs, guides, assistants IA, prompts, livrables.
3. Utiliser ce template pour tous les futurs jours des hubs (`challenge`, `21 Jours Chrono`, futurs programmes).

Plus les contenus respecteront ces patterns, plus la transformation côté code donnera un rendu SaaS homogène et haut niveau, sans effort manuel pour chaque jour.
