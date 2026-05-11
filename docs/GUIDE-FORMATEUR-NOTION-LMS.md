# Guide des Bonnes Pratiques – Notion → LMS
## Créer des modules et activités pédagogiques qui s'affichent parfaitement et joliment en front

> 🎯 **Pour qui ?** Formateurs, concepteurs pédagogiques, équipes L&D d'Impulsion Studio.
> 🧱 **Pour quel outil ?** Le moteur **notion-publisher** (Next.js) qui synchronise vos bases Notion et les affiche en front (pages statiques, programmes async, sprints sync, événements).
> ⏱️ **Lecture :** 25 min — **Appropriation :** 30 min — **Niveau :** débutant à avancé.

---

## 📑 Table des matières

1. [✨ Introduction — pourquoi Notion comme source unique](#1--introduction--pourquoi-notion-comme-source-unique)
2. [🎓 Principes pédagogiques de base](#2--principes-pédagogiques-de-base)
3. [🏗️ Structure idéale d'un module dans Notion](#3--structure-idéale-dun-module-dans-notion)
4. [🎨 Mise en page & blocs « LMS-friendly »](#4--mise-en-page--blocs--lms-friendly-)
5. [📚 Création des activités pédagogiques](#5--création-des-activités-pédagogiques)
6. [🖼️ Règles pour un rendu visuel excellent en front](#6--règles-pour-un-rendu-visuel-excellent-en-front)
7. [🔄 Synchronisation Notion → Front (le « publish »)](#7--synchronisation-notion--front-le--publish-)
8. [📋 Templates prêts à l'emploi](#8--templates-prêts-à-lemploi)
9. [✅ Checklist « Prêt à publier »](#9--checklist--prêt-à-publier-)
10. [⚠️ Erreurs fréquentes & prochaines étapes](#10--erreurs-fréquentes--prochaines-étapes)

---

## 1. ✨ Introduction — pourquoi Notion comme source unique

Le moteur **notion-publisher** lit **directement vos pages Notion** via l'API officielle, mirrore vos médias sur Cloudinary, met les données en cache (Upstash KV + Neon Postgres) et affiche le tout dans une interface Next.js fluide et responsive.

> 💡 **Conséquence pratique** : Notion **EST** votre éditeur LMS. Pas d'export, pas de copier-coller, pas de "build à part". Vous écrivez dans Notion → vous lancez un sync → c'est en ligne.

### 🟢 Avantages de ce setup

| Avantage | Ce que ça veut dire pour vous |
|---|---|
| ✍️ **Édition fluide** | Notion comme back-office, à la vitesse de la pensée |
| 👥 **Co-création** | Plusieurs formateurs travaillent en même temps |
| 🔄 **Sync à la demande** | Un appel à `/api/sync/trigger` et tout est mis à jour |
| 🖼️ **Médias persistants** | Vos images Notion (URL S3 qui expirent en 1h) sont **automatiquement mirrorées** sur Cloudinary |
| 🧩 **Widgets interactifs** | 26+ composants UX (quiz, prompts, flip cards…) injectables via simple YAML |
| 🎨 **Rendu pro par défaut** | Typographie, espacement, hiérarchie : aucun CSS à écrire |

### 🔴 Limites à connaître **avant** de créer

| Limite | Mitigation |
|---|---|
| ❌ Pas de quiz noté natif | Utilisez le widget `quiz` (auto-évaluation) ou un Tally/Typeform embed |
| ❌ Pas de tracking SCORM/xAPI | Le tracking se fait via la table Postgres `progress` (clic "Marquer comme terminé") |
| ❌ Une page sans `slug` est **silencieusement ignorée** | Toujours remplir le champ `slug` |
| ⚠️ Les `publishing_status = draft` n'apparaissent pas en prod | Bascule sur `published` quand vous êtes prêt |
| ⚠️ Les URLs Notion natives expirent en ~1h | Le mirror Cloudinary règle ça **automatiquement au sync** |

---

## 2. 🎓 Principes pédagogiques de base

Avant de plonger dans Notion, garder ces 5 principes en tête :

| Principe | Application concrète |
|---|---|
| 🎯 **1 module = 1 objectif d'apprentissage** | Un verbe d'action mesurable ("être capable de…") |
| ⏱️ **Micro-doses (5–15 min/step)** | Découpez vos units en steps courts. Pas de pavé de 1h |
| 🔁 **Alternance théorie ↔ pratique** | Step "intro" → Step "exemple" → Step "exercice" (widget) → Step "conclusion" |
| ✅ **Validation explicite** | Un step important = `Validation requise: oui` → l'apprenant doit cliquer "terminé" |
| 🤝 **Tonalité directe & chaleureuse** | Tutoyer si c'est votre culture, exemples concrets, jamais de jargon non défini |

> ⚡ **Règle des 3 niveaux** : Programme (POURQUOI) → Unit (QUOI) → Step (COMMENT).

---

## 3. 🏗️ Structure idéale d'un module dans Notion

Le moteur attend **3 bases de données Notion** principales, déjà branchées dans `.env.local` :

| Variable env | Rôle | Quand l'utiliser |
|---|---|---|
| `NOTION_PAGES_DB` | Pages statiques (landing, blog, offres) | Hors parcours pédagogique |
| `NOTION_PROGRAMS_DB` | Programmes pédagogiques (async / sync / event) | **Modules de formation** |
| `NOTION_INSTRUCTORS_DB` | Fiches formateurs (avatar, bio, LinkedIn) | Référencé par programmes & cohortes |

### 🌳 La hiérarchie unifiée (modèle v3)

```
📘 PROGRAM (ligne dans NOTION_PROGRAMS_DB)
│
├─ Body : intro, contexte, présentation, ressources 📌
├─ ⚙️ Config (callout) → metadata programme (optionnel)
│
└─ 📂 UNIT (child page du programme — ex: "Jour 1", "Module 2")
    │
    ├─ Body : description de la unit, intro
    ├─ ⚙️ Config (callout) → durée, déverrouillage, accès
    │
    └─ 📄 STEP (child page de la unit — ex: "Vidéo intro", "Exercice")
        │
        ├─ Body : le contenu d'apprentissage réel
        └─ ⚙️ Config (callout) → durée, type, validation requise
```

### 🏷️ Propriétés Notion attendues sur un Program

| Propriété Notion | Type | Obligatoire ? | Sémantique |
|---|---|:-:|---|
| `Title` ou `Name` | title | ✅ | Titre du programme |
| `slug` | rich_text | ✅ | URL (`/programs/<slug>`) |
| `type` | select | ✅ | `async` \| `sync` \| `event` |
| `description` | rich_text | recommandé | Pitch court (SEO + cards) |
| `cover_image` | files | recommandé | Image hero (mirror Cloudinary auto) |
| `thumbnail` | files | recommandé | Vignette pour les cards de catalogue |
| `instructors` | relation → Instructors DB | recommandé | 1 ou plusieurs formateurs |
| `visibility` | select | optionnel | `public` \| `unlisted` \| `private` |
| `password` | rich_text | si privé | Mot de passe d'accès |
| `publishing_status` | select | ✅ pour live | `draft` \| `published` \| `archived` |
| `price` | number | optionnel | 0 ou vide = gratuit |
| `currency` | select | optionnel | Défaut `EUR` |
| `certificate_enabled` | checkbox | optionnel | Génère un certificat à la complétion |
| `start_datetime` | date | pour `type=event` | Date de l'événement |

### 🧩 Les deux callouts magiques

Deux callouts ont une **sémantique spéciale** et sont **filtrés du rendu body** :

#### ⚙️ Callout `Config` — metadata structurée

À placer en **haut du body** du programme, d'une unit, ou d'un step.

**Sur une UNIT :**
```
⚙️ Config
• Durée : 45 min
• Déverrouillage : J+7
• Accès : gratuit
```

**Sur un STEP :**
```
⚙️ Config
• Durée : 15 min
• Type : exercice
• Validation requise : oui
```

> 💡 Le parser est **tolérant** : accents, majuscules, FR/EN, ordre libre. Synonymes acceptés :
> - Durée → `duration`, `temps`
> - Déverrouillage → `unlock`, `unlock_at`
> - Validation → `check`, `require_check`

#### 📌 Callout `Ressources` — pinned dans la sidebar

À placer dans le body d'un programme ou d'une unit. Apparaîtra dans la **sidebar de droite** côté front.

```
📌 Ressources
• Slides Google : https://docs.google.com/...
• Template Notion : (lien interne vers une autre page)
• PDF récap : https://...
```

---

## 4. 🎨 Mise en page & blocs « LMS-friendly »

Voici **la liste exhaustive** de ce qui est supporté par le renderer (`Blocks.tsx`). Référez-vous-y avant d'utiliser un bloc exotique.

### ✅ Blocs texte & structure (parfait)

| Bloc Notion | Rendu | Astuce |
|---|---|---|
| `Heading 1/2/3` | Titres avec ancres | H1 = titre de step ; H2/H3 = sections |
| `Paragraph` | Prose avec rich text (gras, italic, lien, couleur) | Tutoyer, phrases courtes |
| `Bulleted / Numbered list` | Listes groupées intelligemment | Max 5–7 items pour rester lisible |
| `To-do` | Checkbox interactive (front) | Idéal pour récap d'objectifs |
| `Quote` | Bloc citation stylé | Citation expert, témoignage |
| `Toggle` | Pliable | Cacher détails / réponses |
| `Toggle Heading 1/2/3` | Section pliable hiérarchique | FAQ, sections optionnelles |
| `Callout` | Encadré avec emoji + couleur | 💡 conseil, ⚠️ attention, ❌ piège |
| `Divider` | Séparateur horizontal | Aérez vos sections |

### ✅ Médias (parfait avec mirror auto)

| Bloc | Rendu | Notes |
|---|---|---|
| `Image` | Lightbox + dimensions auto | URLs Notion → mirror Cloudinary auto |
| `Video` | YouTube → embed nocookie ; sinon HTML5 | Détecte `?t=2m30s` |
| `Audio` | Lecteur HTML5 | Podcasts, voice-over |
| `File` | Bouton téléchargement | PDF, ZIP, slides |
| `Bookmark` | Carte preview | URLs (LinkedIn, articles…) |
| `Embed` | Iframe générique + détection YouTube/Tally/Airtable/PDF | |
| `Equation` | KaTeX | Formules maths |
| `Code` | Syntax highlighting | + déclencheur **widget YAML** ⚡ |

### ✅ Layout & structure avancée

| Bloc | Rendu | Notes |
|---|---|---|
| `Columns` | Colonnes responsives | Ratios respectés |
| `Table` | Table HTML | Headers respectés |
| `Synced block` | Transparent | Contenu partagé entre pages |
| `Table of contents` | Auto-généré depuis H1/H2/H3 | À placer en haut d'une longue page |
| `Child page` | Carte de lien interne | Auto-résolution du slug |
| `Link to page` | Carte de lien interne | Idem |

### ⚠️ Blocs partiels / à éviter

| Bloc | Statut | Conseil |
|---|---|---|
| `Database inline view` | Fonctionne en list/gallery/table | OK mais lent si > 50 items |
| `Database linked view` | Idem | Préférer un lien direct |
| `Button` Notion natif | Non supporté | Utiliser la syntaxe `[Texte]{btn:primary}` dans un paragraphe |
| `AI block` / `Wiki block` | Ignorés | Ne pas utiliser |
| Commentaires inline | Ignorés | OK pour la collab interne, invisibles au front |

### 🎯 Bouton inline (syntaxe spéciale)

Tapez dans un paragraphe ou callout :

```
Découvrez le programme : [Je m'inscris]{btn:primary}
Ou plus tard : [En savoir plus]{btn:ghost}
```

→ Rendu en vrai bouton stylisé côté front.

---

## 5. 📚 Création des activités pédagogiques

Une **activité** = un **Step**. Cadre type :

### 🧱 Cadre général d'un step

```
1. 🎯 Objectif du step (1 phrase)
2. 📝 Consigne / contexte (paragraphe court)
3. 📦 Ressources (vidéo, PDF, lien — en blocs natifs)
4. 🛠️ Action de l'apprenant (widget ou tâche)
5. ✅ Validation (callout récap + Config "Validation requise: oui")
```

### 🔄 Activités synchrones (sync / event)

Pour les programmes `type=sync` ou `type=event` (sessions live, ateliers, webinaires) :

| Élément | Comment le faire |
|---|---|
| 📅 **Date & heure** | Champ `start_datetime` (pour event) ou via la **cohorte** liée (pour sync) |
| 👥 **Lien de la session live** | Bloc `embed` Zoom/Meet/Teams + bookmark de secours |
| 🧑‍🏫 **Animateur** | Relation `instructors` → fiche du formateur (auto-affichée) |
| 📋 **Préparation** | Step asynchrone **avant** la session (lectures, brief) |
| 🧠 **Travail post-session** | Step "Synthèse" avec widget `simple_checklist` ou `prompt` |

#### 🎬 Exemple — Atelier sync « Brief client »

```
📂 UNIT : "Atelier 1 - Conduire un brief client"
   ⚙️ Config
   • Durée : 2h
   • Déverrouillage : J-2 (2 jours avant la session)
   • Accès : payant

   📄 STEP 1 : "À préparer avant l'atelier" (type: intro)
      → Vidéo intro 5 min + checklist de prep

   📄 STEP 2 : "Session live - 14h00 jeudi" (type: étape)
      → Lien Zoom (embed) + ordre du jour
      → ⚙️ Config : Validation requise : oui

   📄 STEP 3 : "Debrief & livrable" (type: conclusion)
      → Widget `prompt` pour rédiger le compte-rendu
```

### 💻 Activités asynchrones (async)

Pour les programmes `type=async` (self-paced) :

| Pattern | Quand l'utiliser |
|---|---|
| 📺 **Vidéo + quiz** | Apport théorique → validation rapide |
| 📖 **Lecture + flip cards** | Concept à mémoriser |
| 🛠️ **Cas pratique + prompt** | Application concrète (IA, copywriting…) |
| 🤔 **Réflexion + form** | Introspection guidée |
| 🎲 **Choix branchant** | Personnalisation du parcours |

#### 🎬 Exemple — Step async « Comprendre l'AIDA »

````
📄 STEP : "Le framework AIDA"
   ⚙️ Config
   • Durée : 12 min
   • Type : étape
   • Validation requise : oui

   📺 [Vidéo YouTube de 6 min]

   💡 À retenir
   AIDA = Attention → Intérêt → Désir → Action.
   C'est la colonne vertébrale de 80% des landing pages efficaces.

   🔻 Toggle "Exemple concret"
      [Capture d'écran d'une landing page Apple]

   ```yaml
   widget: quiz
   title: "Vérifiez votre compréhension"
   question: "Quelle étape vient juste après Intérêt ?"
   options:
     - text: "Action"
       feedback: "Presque ! Il manque une étape."
       correct: false
     - text: "Désir"
       feedback: "Exact ! On crée le désir avant l'action."
       correct: true
   ```
````

### 🎛️ Widgets disponibles (à coller dans un code block YAML)

| Widget | `widget:` key | Usage |
|---|---|---|
| 🧪 Quiz | `quiz` | QCM auto-évalué |
| ✍️ Prompt | `prompt` | Template à remplir |
| 📝 Form | `form` | Formulaire simple → output mustache |
| 📑 Tabs Form | `tabs_form` | Formulaire à onglets |
| 🎴 Flip Cards | `flip_cards` | Cartes recto/verso |
| 📋 Checklist | `checklist` / `simple_checklist` | Items à cocher |
| 🌿 Branch Choice | `branch_choice` | Choix → redirection step |
| 🎯 Single Choice | `single_choice` | Sélection radio |
| 🧩 Fill Blanks | `fill_blanks` | Compléter les blancs |
| 💡 Suggestion Cards | `suggestion_cards` | Cartes inspiration |
| ✅ Affirmation Check | `affirmation_check` | Validation d'affirmation |
| ⏱️ Time Calc | `time_calc` | Calculatrice de temps |
| 🧪 Live Test | `live_test` | Test live exécutable |
| 📊 Plan Table | `plan_table` | Tableau de planning |
| 🎨 Plan Prompt | `plan_prompt` | Prompt structuré |
| 🧱 Pattern Builder | `pattern_builder` | Constructeur de pattern |
| 🤖 Persona AI | `persona_ai` | Construire persona + prompt IA |
| 👤 Persona Builder | `persona_builder` | Builder persona simple |
| 🗂️ Evidence Board | `evidence_board` | Tri de données par colonnes |
| 💎 Insight Board | `insight_board` | Board d'insights |
| 🧠 Brainstorm Deck | `brainstorm_deck` | Deck de brainstorm |
| 🎯 Decision Focus | `decision_focus` | Matrice de décision |
| 📜 Prompt Template | `prompt_template` | Template multi-champs |
| 🖼️ Image Prompt | `image_prompt` | Prompt visuel + chips |

> 💾 **Les réponses sont sauvegardées en `localStorage`** dans le navigateur de l'apprenant. Pas besoin de DB.

---

## 6. 🖼️ Règles pour un rendu visuel excellent en front

### 📐 Tailles & ratios

| Élément | Recommandation |
|---|---|
| 🖼️ **Cover image programme** | 1920×1080 (16:9), JPG/PNG, < 500 Ko |
| 🪪 **Thumbnail (card)** | 800×600 (4:3) ou 1280×720 (16:9) |
| 🧑 **Photo formateur** | 800×800 carré, fond uni de préférence |
| 📺 **Vidéo intégrée** | YouTube/Vimeo (jamais .mp4 uploadé en natif) |
| 📄 **Image inline dans un step** | Largeur max 1200px, optimisée |

### 🎨 Typographie & hiérarchie

- ✅ **H1 = titre du step** (une seule fois)
- ✅ **H2 = sections principales** (3–5 max)
- ✅ **H3 = sous-sections** (à parcimonie)
- ❌ Pas de gras tout le paragraphe → perd son sens
- ❌ Pas de souligné dans la prose (Notion ne l'a pas, tant mieux)
- ✅ Italique pour les *termes techniques* à leur première occurrence

### 🌈 Couleurs

- ✅ Utilisez les **couleurs Notion natives** (default, gray, brown, orange, yellow, green, blue, purple, pink, red) → toutes mappées en thème
- ✅ **Background colors sur callouts** → tone visuel respecté
- ❌ N'attendez pas une couleur HEX custom → ignorée

### 📦 Espacement

- ✅ **Un `Divider`** entre chaque grande section
- ✅ **Un saut de ligne vide** entre paragraphes (Notion gère, ne triplez pas)
- ❌ Ne créez pas 10 paragraphes vides → ignorés à l'affichage

### ✅ Ce qui passe parfaitement
- Toggle pour cacher solutions/réponses
- Colonnes 2/3 pour mettre vidéo à gauche + texte à droite
- Callouts colorés pour conseils, pièges, points-clés
- Tables pour comparer 2–3 options
- Code blocks avec langage spécifié

### ❌ Ce qui ne passera pas (ou mal)
- ❌ **Database de 200+ items en inline view** → lent
- ❌ **Vidéos uploadées dans Notion** (`.mp4` natif) → URL expire en 1h, pas mirrorée
- ❌ **Tableaux > 6 colonnes** → scroll horizontal en mobile
- ❌ **Images sans description** → mauvais SEO + accessibilité
- ❌ **Pages sans `slug`** → silencieusement ignorées au sync

---

## 7. 🔄 Synchronisation Notion → Front (le « publish »)

Le moteur ne fait **pas de polling automatique** par défaut. Vous devez **déclencher la sync** quand vous voulez voir vos changements en ligne.

### 🚀 Les commandes de sync

```bash
# Sync local (dev server)
npm run sync

# Sync local — forcer le re-fetch complet (ignore le cache)
npm run sync:force

# Sync prod
npm run sync:prod

# Sync prod — forcer
npm run sync:prod:force
```

Sous le capot, ces commandes hit l'endpoint :
```
GET /api/sync/trigger?secret=${CRON_SECRET}
```

### 🛠️ Sync depuis l'admin

Si vous êtes admin connecté, vous pouvez aussi déclencher la sync depuis `/admin` sans toucher au terminal.

### 🔁 Pipeline de sync (ce qui se passe)

```
1. 📥 Fetch des bases Notion (Pages, Programs, Instructors)
2. 🖼️ Mirror des images Notion S3 → Cloudinary (idempotent)
3. 📦 Stockage en Upstash KV (cache + content store)
4. 🗃️ Index navigation, slugs, sidebar
5. ✅ Front affiche les nouveautés
```

### ⏱️ Combien de temps ça prend ?

| Volume | Durée approx (sans `force`) |
|---|---|
| < 20 pages | 5–15 s |
| 20–100 pages | 30–60 s |
| 100+ pages + médias | 1–3 min |

> 💡 **Astuce** : si vous avez juste corrigé une typo, un sync normal suffit (cache hit). Si vous avez ajouté des images, lancez `sync:force` pour forcer le mirror Cloudinary.

---

## 8. 📋 Templates prêts à l'emploi

### 📘 Template Programme (à dupliquer dans `NOTION_PROGRAMS_DB`)

```
Titre : Apprendre à pitcher en 7 jours
Slug : pitch-7-jours
Type : async
Description : Maîtrise l'art du pitch en une semaine, à ton rythme.
Cover image : [upload 1920×1080]
Thumbnail : [upload 800×600]
Instructors : @Marie Dupont
Visibility : public
Publishing status : published
Price : 0
Certificate enabled : ✓

—— Body de la page ——

# Bienvenue dans Pitch 7 jours 👋

Tu vas apprendre à structurer, raconter et délivrer un pitch
qui convainc en moins de 60 secondes.

📌 Ressources
• Template de pitch (Google Slides) : https://...
• Livre de référence : https://...

—— Child pages (units) ——
📂 Jour 1 — Les fondations
📂 Jour 2 — La structure narrative
📂 Jour 3 — Le hook qui accroche
📂 Jour 4 — La preuve sociale
📂 Jour 5 — Le call to action
📂 Jour 6 — Répétition & feedback
📂 Jour 7 — Pitch final
```

### 📂 Template Unit (child page d'un programme)

```
Titre : Jour 1 — Les fondations

—— Body ——

⚙️ Config
• Durée : 30 min
• Déverrouillage : J+0
• Accès : gratuit

# Aujourd'hui, tu vas comprendre ce qu'est un bon pitch

3 steps. 30 min. Go 🚀

📌 Ressources
• Checklist du jour : [lien interne]

—— Child pages (steps) ——
📄 Pourquoi le pitch est si important
📄 Les 4 piliers d'un pitch qui marche
📄 Auto-diagnostic : où en es-tu ?
```

### 📄 Template Step (child page d'une unit)

````
Titre : Les 4 piliers d'un pitch qui marche

—— Body ——

⚙️ Config
• Durée : 12 min
• Type : étape
• Validation requise : oui

# Les 4 piliers d'un pitch qui marche

Un bon pitch repose toujours sur 4 fondations.

📺 [Vidéo YouTube : "Les 4 piliers" — 5 min]

## 1. Le problème

Phrase d'accroche : *"Aujourd'hui, 8 startups sur 10 échouent à pitcher."*

## 2. La solution

[...]

💡 À retenir
Si l'un des 4 piliers est absent, ton pitch tombe à plat. Pas de raccourci.

—— Widget quiz ——

```yaml
widget: quiz
question: "Quel pilier vient en premier ?"
options:
  - text: "La solution"
    correct: false
    feedback: "Trop tôt ! On présente d'abord le problème."
  - text: "Le problème"
    correct: true
    feedback: "Exact 🎯"
  - text: "L'équipe"
    correct: false
    feedback: "L'équipe vient en dernier, après la traction."
```

—— Récap ——

✅ Tu as terminé ce step. Clique sur "Marquer comme terminé" pour passer au suivant.
````

### 🧑 Template fiche Instructor (`NOTION_INSTRUCTORS_DB`)

```
Name : Marie Dupont
Bio : 12 ans d'expérience en marketing growth, ex-Airbnb et Doctolib.
Coache des fondateurs depuis 2020.
Photo : [upload 800×800, fond clair]
Email : marie@impulsion.studio
LinkedIn : https://linkedin.com/in/mariedupont
Role : lead
```

---

## 9. ✅ Checklist « Prêt à publier »

À cocher **avant** de basculer `publishing_status` sur `published` et de lancer le sync prod.

### 🏷️ Méta-données

- [ ] **Slug** rempli, en kebab-case, unique
- [ ] **Title** clair et orienté bénéfice
- [ ] **Description** de 1–2 phrases (SEO + cards)
- [ ] **Cover image** uploadée (1920×1080)
- [ ] **Thumbnail** uploadée (800×600)
- [ ] **Type** correct (`async` / `sync` / `event`)
- [ ] **Visibility** correct (`public` / `unlisted` / `private`)
- [ ] **Password** rempli si `private`
- [ ] **Instructors** liés (au moins 1)
- [ ] **Price** & **Currency** corrects (ou laissés vides si gratuit)

### 🏗️ Structure

- [ ] Au moins **3 units** dans le programme
- [ ] Chaque unit a une **⚙️ Config** (durée + déverrouillage)
- [ ] Chaque step a une **⚙️ Config** (durée + type)
- [ ] Steps de validation marqués `Validation requise: oui`
- [ ] Pas de **page sans slug** (vérification rapide en table view)

### 🎨 Contenu

- [ ] Hiérarchie H1/H2/H3 cohérente (un seul H1 par step)
- [ ] **Vidéos en YouTube/Vimeo** (pas en upload Notion natif)
- [ ] Toutes les **images ont un caption ou alt**
- [ ] Pas de **callout vide** ou de paragraphe orphelin
- [ ] Liens externes testés (pas de 404)
- [ ] **Ressources 📌** organisées dans la sidebar

### 🛠️ Widgets

- [ ] Tous les YAML widgets ont une **syntaxe valide** (pas de tabulations, indentation 2 espaces)
- [ ] Au moins **1 widget interactif par unit** (quiz, prompt, checklist…)
- [ ] Les widgets `branch_choice` pointent vers des **slugs valides**

### 🔁 Sync & QA

- [ ] Sync local lancée : `npm run sync`
- [ ] Pages testées **sur mobile** (iPhone + Android)
- [ ] Pas de **404** sur les liens internes
- [ ] **Lightbox images** fonctionnel
- [ ] **Vidéos** se lancent sans erreur
- [ ] Sync prod : `npm run sync:prod`
- [ ] Bascule `publishing_status` → `published` **après** validation

---

## 10. ⚠️ Erreurs fréquentes & prochaines étapes

### 🚨 Top 10 des erreurs à éviter

| # | Erreur | Symptôme | Fix |
|:-:|---|---|---|
| 1 | Pas de `slug` | Page invisible en prod | Remplir le champ `slug` |
| 2 | `publishing_status = draft` oublié | Page visible mais devrait être cachée | Bascule sur `draft` ou `archived` |
| 3 | Vidéo `.mp4` uploadée dans Notion | Vidéo ne se charge pas après 1h | Uploader sur YouTube/Vimeo, embed |
| 4 | Callout ⚙️ Config mal formaté | Durée non détectée | Vérifier syntaxe `• Durée : 15 min` |
| 5 | Widget YAML avec tabulations | Widget non rendu | Indenter en 2 espaces, jamais tab |
| 6 | Pas de cover image | Cards moches en catalogue | Uploader cover + thumbnail |
| 7 | Image non mirrored | Image 404 après 1h | Lancer `sync:force` |
| 8 | Instructeur sans photo | Avatar par défaut | Upload photo carrée 800×800 |
| 9 | Programme `type=sync` sans cohorte | Pas de date affichée | Créer une cohorte liée |
| 10 | Mot de passe oublié pour page privée | Personne ne peut accéder | Définir `password` ou passer en `unlisted` |

### 🎯 Comment utiliser ce guide

1. 📖 **Lecture rapide** (10 min) — section 1 à 4 pour comprendre le modèle
2. 🏗️ **Premier programme test** (30 min) — dupliquer le template section 8
3. 🔁 **Sync & QA** — lancer `npm run sync` et tester sur mobile
4. ✅ **Checklist** (section 9) — cocher chaque ligne avant publication
5. 🚀 **Publier** — `publishing_status = published` + sync prod

### 🔮 Prochaines étapes (roadmap recommandée)

- 🎓 **Créer votre premier programme `async`** (le plus simple)
- 🤝 **Tester un atelier `sync`** avec une cohorte de 3–5 personnes
- 📊 **Suivre la progression** via la table Postgres `progress` (admin)
- 💡 **Itérer** sur les widgets : tester un quiz → un prompt → un flip cards
- 🌍 **Multi-formateurs** : créer fiches Instructors, lier sur programmes
- 🏆 **Activer les certificats** (`certificate_enabled: true`) pour les programmes complets

### 🆘 En cas de souci

| Problème | Où chercher |
|---|---|
| Page invisible | Vérifier `slug` + `publishing_status` |
| Image cassée | Lancer `npm run sync:force` |
| Widget ne s'affiche pas | Vérifier YAML valide (yamllint.com) |
| Sync échoue | Logs serveur + `CRON_SECRET` correct |
| Photo formateur expire | Lancer sync (mirror Cloudinary automatique) |

---

> 🚀 **Vous y êtes.** Vous avez maintenant tout pour créer un programme pédagogique complet, beau et interactif dans Notion, et le voir s'afficher parfaitement en front.
>
> 💬 Pas besoin de coder. Pas besoin d'exporter. Notion → sync → en ligne.
>
> Bonne création ! 🎨🎓
