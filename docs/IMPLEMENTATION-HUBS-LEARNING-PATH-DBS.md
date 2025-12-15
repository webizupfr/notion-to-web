# Plan d’implémentation – Hubs alignés sur `/sprint` (DBs dédiées)

## 1. Objectifs

- Aligner la structure pédagogique des **hubs** sur celle des **sprints**, sans toucher au code `/sprint`.
- Garder la **cohorte** comme couche d’orchestration (calendrier, accès, labels) au‑dessus d’un **learning path** générique.
- Supprimer les comportements parasites dans la sidebar des hubs (ex. section *Autres contenus* non voulue, mélange de sources) en ayant des **bases Notion dédiées** comme source de vérité.

En pratique : un hub devient l’équivalent d’un sprint, mais avec :

- 1 DB pour les hubs (`NOTION_HUBS_DB`) – déjà en place.
- 1 DB pour les **unités** du learning path (jours/modules), reliées au hub.
- 1 DB pour les **activités**, reliées aux unités.

Le front (sidebar, StartToday, StepWizard, ActivityContent, cohorte) reste inchangé : on continue d’alimenter `meta.learningPath` et `applyCohortOverlay` fait le travail.

---

## 2. État actuel (résumé)

### 2.1 Hubs

- Les hubs sont synchronisés depuis `NOTION_HUBS_DB` via `syncHub` dans `src/app/api/sync/route.ts:1323`.
- Le `learningPath` des hubs est construit par `buildLearningPathFromPage(pageId, hubSlug)` :
  - Scanne les **databases inline** ou `link_to_page` dans la page Notion du hub.
  - Identifie une DB des **unités** (jours/modules) + une DB des **activités**.
  - Construit un `LearningPath` (`days: DayEntry[]`, `kind`, labels) à partir de ces DB.
- Inconvénient : le fait d’être basé sur des DB inline + la logique générique pour les child pages déclenche parfois la section *Autres contenus* dans la sidebar sur les pages enfants.

### 2.2 Cohortes

- Les cohortes viennent d’une DB `NOTION_COHORTS_DB` (voir `src/lib/cohorts.ts`).
- Chaque cohorte (`CohortMeta`) porte :
  - `hubNotionId` (relation vers le hub),
  - `startDate`, `timezone`,
  - `scheduleMode` (`relative` ou `absolute`),
  - `visibility`, `password`,
  - labels d’unité (`unitLabelSingular/Plural`).
- Sur un hub, la cohorte :
  - peut surcharger la visibilité / le mot de passe,
  - applique `applyCohortOverlay(learningPath, cohort)` pour :
    - recalculer les `unlockDate` à partir de `startDate` + `unlockOffsetDays` / `order`,
    - surcharger les labels d’unité.

Cette logique de cohorte **ne doit pas être modifiée**.

### 2.3 Sprints (modèle cible)

- `SPRINTS_DB` → sprints → `SprintBundle`.
- DB Modules → `SprintModule` (ordre, jour, lock, etc.).
- DB Activités → `SprintActivity` (ordre, type, durée, contenu).
- Navigation / structure :
  - jamais basée sur des DB inline pour les modules/activités,
  - uniquement sur les bundles synchronisés + navigation de contexte (`contextNavigation`).

---

## 3. Architecture cible pour les hubs

### 3.1 Côté Notion – bases et relations

1. **DB Hubs** (`NOTION_HUBS_DB`) – déjà en place  
   - Colonnes existantes conservées (slug, description, sync_strategy, max_depth, etc.).
   - 1 ligne = 1 programme (ex. *Hub 5 jours – gratuit*, *Hub 21 jours – payant*).

2. **DB Unités** (ex. *Learning Units* – nouvelle DB)  
   - Contenu : chaque ligne représente un **jour** ou un **module** du learning path d’un hub.
   - Colonnes recommandées (pour rester compatibles avec le parsing existant) :
     - `title` / `Titre` (type *title*)  
       → Titre du jour/module (affiché dans la sidebar et les vues).
     - `ordre` / `order` / `index` (type *number*)  
       → Ordre dans le parcours (1, 2, 3, …).
     - `etat` / `État` / `state` / `status` (type *select* ou *status*)  
       → État (ouvert, verrouillé, etc.). Permet d’exclure certains jours si voulu.
     - `resume` / `Résumé` / `summary` / `description` (type *rich_text*)  
       → Description courte affichée dans la sidebar.
     - `date_deblocage` / `unlock` / `date` (type *date*)  
       → Date d’unlock absolue au niveau hub (optionnel, utile si `scheduleMode = 'absolute'`).
     - `décalage` / `decalage` / `offset` / `unlock_offset` (type *number*)  
       → Décalage en jours par rapport à `startDate` de la cohorte (mode `relative`).  
         Si vide, on utilisera `order - 1` comme aujourd’hui.
     - `slug` (type *rich_text* ou *title* secondaire)  
       → Slug “local” (ex. `jour-01`, `jour-02`).  
         Si absent, on dérive un slug par défaut type `jour-01` / `module-01`.
     - `hub` (type *relation* → `NOTION_HUBS_DB`)  
       → À quel hub cette unité appartient.

   - Chaque hub pourra ainsi avoir :
     - un chemin `days` (kind `'days'`),
     - ou un chemin `modules` (kind `'modules'`), selon le nom de la DB (voir ci‑dessous).

3. **DB Activités** (ex. *Learning Activities* – nouvelle DB)  
   - Contenu : chaque ligne représente une **activité (step)** associée à une unité (jour/module).
   - Colonnes recommandées :
     - `title` / `Titre` (type *title*).
     - `ordre` / `order` / `index` (type *number*)  
       → Ordre de l’activité dans la journée/module.
     - `type` / `category` (type *select* ou *status* ou *rich_text*)  
       → `step`, `intro`, `option`, etc.  
         On garde la logique actuelle : on exclut les activités dont le type contient “option”.
     - `duree` / `durée` / `duration` (type *number* ou *rich_text*)  
       → Durée affichée (ex. `30 min`).
     - `instructions` / `contenu` / `content` / `texte` (type *rich_text*)  
       → Texte détaillé (brief).
     - `lien` / `url` (type *url*)  
       → Lien externe éventuel.
     - Relation vers unités :
       - `jour` / `day` / `module` / `modules` (type *relation* → DB Unités)  
         → C’est cette relation qui permet de rattacher la step au bon jour/module.

### 3.2 Détermination du type d’unité (jour vs module)

On réutilise la logique actuelle de `buildLearningPathFromPage` :

- Le **kind** (`'days' | 'modules'`) et les labels (`unitLabelSingular/Plural`) sont inférés à partir du **nom de la DB Unités** via des patterns :
  - Si le nom contient `jour` → `kind = 'days'`, labels `Jour` / `Jours`.
  - Si le nom contient `module` → `kind = 'modules'`, labels `Module` / `Modules`.
  - Autres variantes possibles : `session`, `phase`, `sprint` (déjà supportées).

### 3.3 Rôle de la cohorte dans cette nouvelle architecture

- Rien ne change dans `applyCohortOverlay` :
  - `unlockOffsetDays` reste la donnée générique au niveau hub (unité).
  - `scheduleMode` et `startDate` au niveau cohorte injectent le calendrier final.
  - `unitLabelSingular/Plural` peuvent être surchargés par cohorte.
- Le `learningPath` construit depuis les DB sera donc toujours un **template neutre**, cohorte‑agnostique.

---

## 4. À faire côté Notion (toi)

### 4.1 Créer / configurer la DB Unités

1. Créer une nouvelle DB (par exemple *Learning Units*).  
2. Ajouter les colonnes listées en 3.1.2 :
   - `Titre` (title),
   - `ordre` (number),
   - `État` (status ou select),
   - `Résumé` (rich_text),
   - `date_deblocage` (date),
   - `décalage` (number),
   - `slug` (rich_text),
   - `hub` (relation vers `NOTION_HUBS_DB`).
3. Nommer la DB de façon explicite pour que les patterns la reconnaissent :
   - ex. `Jours – Hub IA` pour un parcours par jours,
   - ex. `Modules – Hub IA` pour un parcours par modules.

### 4.2 Créer / configurer la DB Activités

1. Créer une nouvelle DB (par exemple *Learning Activities*).  
2. Ajouter les colonnes listées en 3.1.3 :
   - `Titre` (title),
   - `ordre` (number),
   - `type` (select/status/texte),
   - `duree` (number ou texte),
   - `instructions` (rich_text),
   - `lien` (url),
   - relation `jour` / `module` (relation vers DB Unités).

### 4.3 Relier les unités aux hubs

Pour chaque hub (page dans `NOTION_HUBS_DB`) :

1. Créer les unités correspondantes dans DB Unités :
   - 1 unité par jour ou module.
   - Remplir `ordre`, `Titre`, `Résumé` et éventuellement :
     - `slug`,
     - `date_deblocage` (si tu veux des dates absolues),
     - `décalage` (offset différent de `order - 1`).
2. Dans chaque unité, renseigner la relation `hub` vers la page du hub concerné.

### 4.4 Relier les activités aux unités

Pour chaque unité :

1. Créer les activités correspondantes dans DB Activités.
2. Pour chaque activité :
   - `Titre` = nom de l’étape,
   - `ordre` = position dans la journée/module,
   - `type` = `intro`, `step`, `conclusion`, `option`, etc.  
     → Les `type` contenant “option” seront exclus du wizard, comme aujourd’hui.
   - `duree`, `instructions`, `lien` si nécessaire.
   - Renseigner la relation `jour` / `module` vers l’unité correspondante.

### 4.5 Migration de l’existant (programme 30j → 5j + 21j)

1. Créer ou vérifier les hubs :
   - Hub A : *Programme 5 jours – gratuit*.
   - Hub B : *Programme 21 jours – payant*.
2. Dans DB Unités :
   - Créer 5 unités pour Hub A (Jour 1–5).
   - Créer 21 unités pour Hub B (Jour 1–21).
   - Les unités peuvent pointer vers des pages de contenu existantes (mêmes slugs) si tu veux réutiliser les mêmes pages Notion.
3. Dans DB Activités :
   - Créer les activités pour chaque unité, en reprenant la structuration de ton programme actuel.
4. Dans `NOTION_COHORTS_DB` :
   - Relier les cohortes au bon hub (`hub` relation).
   - Configurer `startDate`, `scheduleMode`, `timezone`, `visibility`, `password`, `unitLabelSingular/Plural` si différent.

### 4.6 Nettoyage des DB inline dans les hubs

Une fois la nouvelle architecture active :

- Tu pourras **supprimer** ou **rendre discrets** les DB inline de jours/activités dans les pages hub (ou les remplacer par de simples `link_to_page`), ce qui éliminera les sections *Autres contenus* parasites dans la sidebar.

---

## 5. À faire côté code (dans ce repo)

> Objectif : construire `meta.learningPath` des hubs à partir des DB Unités/Activités quand elles sont configurées, sinon fallback sur le comportement actuel (DB inline).

### 5.1 Nouvelles variables d’environnement

Dans `.env.local` :

- `NOTION_LEARNING_UNITS_DB=<id de la DB Unités>`
- `NOTION_LEARNING_ACTIVITIES_DB=<id de la DB Activités>`

Code :

- Déclarer ces constantes dans `src/app/api/sync/route.ts` (à côté de `NOTION_HUBS_DB` / `SPRINTS_DB`).

### 5.2 Nouveau helper `buildLearningPathFromDatabases`

Fichier : `src/app/api/sync/route.ts` (même zone que `buildLearningPathFromPage`).

Signature proposée :

```ts
async function buildLearningPathFromDatabases(
  hub: PageObjectResponse,
  hubSlug: string
): Promise<LearningPath | null>;
```

**Étapes internes :**

1. Récupérer les IDs de DB :
   - `UNITS_DB = process.env.NOTION_LEARNING_UNITS_DB`,
   - `ACTIVITIES_DB = process.env.NOTION_LEARNING_ACTIVITIES_DB`,
   - si l’un des deux manque → retourner `null`.

2. Charger les unités (jours/modules) du hub :
   - `queryDb(UNITS_DB, filter: { property: 'hub', relation: { contains: hub.id } })`.
   - Pour chaque page unité :
     - Lire les propriétés via des helpers similaires à ceux de `buildLearningPathFromPage` :
       - `title` → `DayEntry.title`,
       - `ordre` → `DayEntry.order`,
       - `resume` → `DayEntry.summary`,
       - `etat` / `status` → `DayEntry.state`,
       - `date_deblocage` → `DayEntry.unlockDate`,
       - `décalage` → `DayEntry.unlockOffsetDays`,
       - `slug` → base du slug.
     - Construire le slug complet :  
       `slug = \`${hubSlug}/${slugPart}\`` (avec nettoyage type kebab‑case).
     - Instancier un `DayEntry` sans `steps` pour l’instant.

3. Déterminer `kind` et labels :
   - Récupérer la métadonnée de la DB Unités (`notion.databases.retrieve`).
   - Utiliser les patterns déjà présents (voir `unitPatterns` dans `buildLearningPathFromPage`) pour déterminer :
     - `kind: 'days' | 'modules'`,
     - `unitLabelSingular`, `unitLabelPlural`.

4. Charger les activités et construire la relation unité → steps :
   - `queryDb(ACTIVITIES_DB, { ... })` (filtre éventuel facultatif sur hub si tu ajoutes une relation).
   - Pour chaque activité :
     - Extraire `title`, `ordre`, `type`, `duration`, `url`, `instructions`.
     - Extraire la relation vers les unités (`jour` / `day` / `module` / `modules`).
     - Construire un `ActivityStep` pour chaque relation :
       - `id = activityPage.id`,
       - `order = ordre`,
       - `title`, `type`, `duration`, `url`, `instructions`.
     - Enregistrer dans une `Map<unitId, ActivityStep[]>`.
   - Pour chaque `DayEntry`, attacher `steps` :
     - `steps = relMap.get(unitPage.id) ?? []`.
     - Filtrer comme aujourd’hui (`type` contenant “option” exclu) et trier par `order`.

5. Retourner le `LearningPath` :

```ts
return {
  days: dayEntries.sort((a, b) => a.order - b.order),
  kind,
  unitLabelSingular,
  unitLabelPlural,
};
```

### 5.3 Intégration dans `syncHub` (sans casser l’existant)

Dans `syncHub(hub, opts)` (`src/app/api/sync/route.ts:1323`) :

1. Après avoir obtenu `meta` avec `syncPage`, remplacer le bloc actuel :

```ts
// Actuel
const learning = await buildLearningPathFromPage(hub.id, meta.slug);
if (learning && learning.days.length) { ... }
```

2. Par une séquence avec fallback :

```ts
let learning: LearningPath | null = null;

if (process.env.NOTION_LEARNING_UNITS_DB && process.env.NOTION_LEARNING_ACTIVITIES_DB) {
  learning = await buildLearningPathFromDatabases(hub, meta.slug);
}

if (!learning) {
  learning = await buildLearningPathFromPage(hub.id, meta.slug);
}

if (learning && learning.days.length) {
  const enriched = await getPageBundle(meta.slug);
  if (enriched) {
    enriched.meta.learningPath = learning;
    await setPageBundle(meta.slug, enriched);
    await revalidateTag(`page:${meta.slug}`);
  }
}
```

3. Ne **rien changer** d’autre :
   - `syncSprints`, `loadModule`, `loadActivity` restent intacts.
   - `applyCohortOverlay` reste entièrement inchangé (`src/lib/cohorts.ts`).

### 5.4 Comportement de la sidebar après refonte

- `meta.learningPath` sera désormais alimenté par les DB dédiées.
- La sidebar des hubs continuera d’utiliser :
  - `releasedDays` (jours/units déjà déverrouillés),
  - `learningKind` (`'days'`/`'modules'`),
  - `unitLabel*`.
- En supprimant les DB inline de jours/activités dans la page hub, on évite que `customNavigation` injecte des sections parasites *Autres contenus* pour ces unités.

---

## 6. Plan de déploiement & validation

1. **Préparer les DB Notion** (toi) :
   - Créer DB Unités + DB Activités comme décrit.
   - Créer les unités et activités pour au moins 1 hub pilote (ex. programme 5 jours).
2. **Implémenter le code** (ici) :
   - Ajouter les env vars (en dev).
   - Implémenter `buildLearningPathFromDatabases`.
   - Brancher le fallback dans `syncHub`.
3. **Tester en local** :
   - Lancer la sync (`/api/sync` ou script existant).
   - Vérifier que `meta.learningPath` est bien alimenté depuis les DB pour le hub pilote.
   - Vérifier le comportement cohorte (dates d’unlock, labels) inchangé.
   - Vérifier la sidebar (plus de *Autres contenus* venant des unités).
4. **Migrer les autres hubs** :
   - Reprendre la même structure Unités/Activités.
   - Nettoyer progressivement les DB inline utilisées uniquement pour le learning path.
5. **Prod** :
   - Renseigner les env vars en prod.
   - Déployer.
   - Surveiller les logs de sync et le rendu des hubs.

---

## 7. Répartition des actions

### Côté toi (Notion)

- Créer/configurer DB Unités et DB Activités.
- Pour chaque hub (5 jours, 21 jours, autres) :
  - Créer les unités + les relier au hub.
  - Créer les activités + les relier aux unités.
- Vérifier/coordonner les cohortes (DB `NOTION_COHORTS_DB`) :
  - Relations `hub`,
  - `startDate`, `scheduleMode`, `timezone`, `visibility`, `password`, labels.
- Nettoyer les DB inline utilisées uniquement pour le learning path dans les pages hub.

### Côté moi (code)

- Ajouter les nouvelles env vars et leurs constantes.
- Implémenter `buildLearningPathFromDatabases` dans `src/app/api/sync/route.ts`.
- Brancher la logique de fallback dans `syncHub` :
  - d’abord DB Unités/Activités,
  - sinon comportement actuel (DB inline).
- Lancer/ajuster la sync pour valider le pipeline, sans toucher à `/sprint`.

Une fois ce plan validé, je pourrai passer à l’implémentation concrète côté code en suivant exactement ces étapes. 

