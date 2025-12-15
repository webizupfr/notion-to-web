# Phase 1 — Cartographie du renderer Notion

## 1. Fichiers et responsabilités clés

### Orchestrateur & routing des blocks
- `src/components/notion/Blocks.tsx` : point d’entrée asynchrone qui reçoit une liste de `NotionBlock`, groupe les listes (`groupLists`), construit la table des matières via `collectHeadings`, puis délègue à `renderBlockAsync` pour mapper chaque type Notion vers un composant React. Gère aussi les boutons custom, l’injection de widgets, les collections et la récursion sur les enfants.
- `src/components/notion/utils.ts` : helpers transverses (`groupLists`, `slugify`, types `ListBlock`/`GroupedListBlock`). `groupLists` est essentiel pour convertir les suites de `bulleted_list_item`/`numbered_list_item` en un seul composant `<NotionList>`.

### Accès données & enrichissements
- `src/lib/notion.ts` : wrapper Notion officiel (`pageBlocksDeep`) qui hydrate chaque block avec `__children` (pour la récursion) et expose le type `NotionBlock` (incluant le type personnalisé `button`). Sert aussi à récupérer les métadonnées page/cover.
- `src/lib/resolve-db-id.ts` : résolution d’ID de database pour les blocks `collection_view`, `collection_view_page` et `child_database` (essaye `link_to_page`, puis recherche Notion si nécessaire).
- `src/lib/widget-parser.ts` + `src/components/widgets/renderWidget.tsx` : parsing YAML/URL pour injecter les widgets personnalisés lorsque `parseWidget` reconnaît une config (code block YAML ou embed URL).
- `src/components/notion/CollectionView/NotionCollectionView.tsx` : affichage d’une database (gallery/list) en combinant `unstable_cache`, `getDbBundleFromCache` (KV) et `fetchDatabaseBundle`. Retourne `CollectionNoAccess` en cas de droits insuffisants.

### UI primitives dédiées Notion
- `src/components/notion/ui/*` : chaque bloc est stylé dans un composant dédié (`NotionParagraph`, `NotionHeading`, `NotionCallout`, `NotionList`, `NotionTodo`, `NotionToggle`, `NotionImage`, `NotionMediaFrame`, `NotionEmbed`, `NotionBookmark`, `NotionFile`, `NotionCode`, `NotionEquation`, `NotionTable`, `NotionColumns`, `NotionTableOfContents`, `NotionBreadcrumb`, `NotionButton`, `NotionSpecialEmbeds`, `NotionUnknown`…). `RichText` (même dossier) centralise le rendu inline (mentions, liens, annotations).
- `src/components/notion/ui/NotionSpecialEmbeds.tsx` : variantes spécifiques Tally, Airtable et PDF.
- `src/components/notion/TodoBlock.tsx` : variante client-side (non utilisée dans `Blocks.tsx` actuellement) avec persistance locale.

### Styles & tokens
- `src/app/globals.css` : importe Tailwind 4 + tokens (`src/lib/theme/tokens.css`) + `prose.css`. Définit les classes utilitaires `learning-toggle`, `.callout*`, `.notion-media__inner`, etc., utilisées par les composants Notion.
- `src/lib/theme/prose.css` : stylise `.prose-notion`, `.rt-*` (bold, link, couleurs, fonds) utilisées par `RichText`.
- `src/styles/marketing.css` : skin marketing (tonalité, sections, colonnes) appliqué lorsque les pages marketing enveloppent les blocks Notion dans `MarketingShell`. Important pour garder des composants Notion “neutres” afin que ce skin prenne effet.

## 2. Flux de rendu (Notion ➝ React)
1. **Fetch & enrichissement** : `pageBlocksDeep` ( `src/lib/notion.ts` ) rapatrie les enfants de chaque block, renseigne `__children` (et métadonnées custom telles que `__image_meta` lors de la sync), puis stocke le bundle dans KV.
2. **Invocation** : une page (ex. `src/app/(site)/[...slug]/page.tsx`) appelle `<Blocks blocks={bundle.blocks} currentSlug={slug} renderMode="default" />`.
3. **Pré-traitements (`Blocks`)** :
   - `collectHeadings` parcourt l’arbre pour alimenter la ToC (IDs `b-${block.id}`).
   - `groupLists` fusionne les suites de listes en `GroupedListBlock`.
   - `Promise.all` rend chaque item en parallèle tout en conservant l’ordre via `<Fragment key=...>`.
4. **`renderBlockAsync`** :
   - Détecte d’abord les blocks “button” custom.
   - Implémente les heuristiques (widget dans `embed`/`code`, `parseButtonFromRichText`, `parseYouTube`…).
   - Bascule sur un `switch(type)` pour renvoyer le composant approprié, en passant `Blocks` récursivement via les props `renderChildren`.
5. **Collections** : `renderCollectionBlock` résout l’ID de database et renvoie `<NotionDatabase>` qui charge `NotionCollectionView` (KV + fallback live Notion).
6. **Widgets** : si `parseWidget` renvoie un objet, `renderWidget` construit le widget (client ou server selon le type) en utilisant `currentSlug` ou l’ID du block comme `storageKey` pour les états persistés.
7. **Styles** : chaque composant applique les classes `prose-notion`, `surface-*`, `learning-toggle`, etc., qui se basent sur les tokens CSS globaux. Les variations visuelles (callout, toggles) s’appuient sur des classes globales, évitant d’embarquer de la logique de style dans le renderer.

## 3. Cartographie bloc par bloc

### 3.1 Texte, hiérarchie & structure
| Type Notion | Données utilisées | Composant React | Règles de rendu / remarques |
| --- | --- | --- | --- |
| `button` (custom) | `block.button.label`, `url`, `style` | `NotionButton` (`src/components/notion/ui/NotionButton.tsx`) | Block ajouté lors de la sync. Fallback ghost si `style === "ghost"`. |
| `paragraph` | `paragraph.rich_text` | `NotionParagraph` | Retourne un bouton si `parseButtonFromRichText` détecte `{btn}` ou un seul lien (heuristique grey ➝ variant `ghost`). Sinon, block `prose` + `RichText`. |
| `heading_1/2/3` | `heading_X.rich_text` | `NotionHeading` + `RichText` | ID `b-${block.id}` pour ancre ToC. `collectHeadings` récupère également ces titres pour `table_of_contents` & `breadcrumb`. |
| `quote` | `quote.rich_text` | `NotionQuote` | Wrap `blockquote` + `prose-notion`. |
| `divider` | n/a | `NotionDivider` | Simple `<hr>` en utilisant les tokens `--border`. Sert aussi de séparateur de sections marketing. |
| `bulleted_list_item` / `numbered_list_item` | `rich_text`, `__children` | `NotionList` | Liste fusionnée via `groupLists`. `renderChildren` rappelle `<Blocks>` pour les sous-items. Ajoute `prose-list-nested` pour les enfants. |
| `to_do` | `to_do.rich_text`, `to_do.checked`, enfants | `NotionTodo` | Affiche une carte avec checkbox (non persistée). Les enfants sont rendus via `renderChildren`. Utilise un `id` unique `todo-${block.id}` pour le label. |
| `callout` | `callout.rich_text`, `callout.icon`, `callout.color`, enfants | `NotionCallout` | Choisit la classe `callout-*` selon la couleur (warning, success…). Enfants rendus dans `callout__children`. |
| `toggle` | `toggle.rich_text`, `toggle.color`, enfants | `NotionToggle` | `<details class="learning-toggle">`, caret animé via CSS global. |
| `toggle_heading_1/2/3` | `toggle_heading_X.rich_text`, `color`, enfants | `NotionToggleHeading` (wrap de `NotionToggle`) | Même visuel que `toggle`, mais `collectHeadings` ajoute leurs titres à la ToC (niveau 1/2/3). |
| `code` | `code.rich_text`, `code.language`, `caption` | `NotionCode` ou widget | Concatène le texte en respectant les retours à la ligne. Si YAML + mots-clés `widget:`/`type:`, on tente `parseWidget` et on rend `renderWidget`; sinon, `CodePanel` avec langage en badge. |
| `equation` | `equation.expression` | `NotionEquation` | Affichage inline dans un panel centré, caption optionnelle. |
| `table` | `table.has_column_header`, `table.has_row_header`, enfants `table_row.cells` | `NotionTable` | Reconstruit les lignes à partir des enfants, gère header/row header via props. Taille police 0.95rem. |
| `column_list` | `__children` (columns) | `NotionColumns` | Calcule le nombre de colonnes pour ajuster le grid (`md:grid-cols-2`, `xl:grid-cols-4`, etc.). Chaque colonne reçoit un `<Blocks>` récursif. |
| `column`, `synced_block` | `__children` | `Blocks` (récursion) | `column` n’a pas de wrapper spécifique; on reroute directement vers `Blocks`. `synced_block` réutilise les enfants (après résolution de source côté sync) et se contente de rerendre les blocks enfants. |
| `table_of_contents` | liste `entries` calculée dans `Blocks` | `NotionTableOfContents` | Reçoit `collectHeadings(blocks)` ; applique indentation selon `level`. Visible uniquement s’il y a au moins un heading. |
| `breadcrumb` | titres `toc` | `NotionBreadcrumb` | Transforme chaque heading en item de fil d’Ariane sans lien (href laissé `null`). |
| `child_page` | `child_page.title` | `NotionUnknown` via `renderUnknown` | Non supporté : log console en dev puis fallback “Unsupported block”. |

### 3.2 Médias & embeds
| Type Notion | Données utilisées | Composant React | Règles de rendu / remarques |
| --- | --- | --- | --- |
| `image` | `image.external.url` / `image.file.url`, `image.caption`, `__image_meta` (width, height, maxWidthPx, align) | `NotionImage` + `NotionMediaFrame` | Ajoute `withBackground`, centre/gauche/droite selon `meta.align`, limite la largeur via `maxWidthPx`. Utilise `<img>` standard pour éviter NextImage côté serveur. |
| `video` | `video.external/file.url`, `caption` | `NotionVideo` ou `NotionEmbed` | `parseYouTube` détecte YT/Shorts/watch/embed ➝ `NotionEmbed` (no-cookie). Sinon, `<video controls>` wrapped dans `NotionMediaFrame`. |
| `audio` | `audio.external/file.url`, `caption` | `NotionAudio` | `NotionMediaFrame` avec padding `m`. |
| `embed` | `embed.url`, `embed.caption` | `NotionEmbed` ou widget spécial | Priorité : `parseWidget(url)` ➝ `renderWidget`, sinon `parseYouTube`, puis heuristiques Tally/Airtable/PDF : `NotionTallyEmbed`, `NotionAirtableEmbed`, `NotionPdfEmbed`. Default : `<iframe>` responsive. |
| `bookmark` | `bookmark.url`, `bookmark.caption` | `NotionBookmark` ou embed spécial | Même heuristiques que `embed` (YouTube/Tally/Airtable/PDF). Sinon, `surface-card` contenant le titre et le domaine (dérivé via helper interne). |
| `file` | `file.external/file.url`, `caption`, `name` | `NotionFile` | Carte avec lien `download`. |
| `pdf` (via embed/bookmark detection) | URL | `NotionPdfEmbed` | Rendu via composant `PdfEmbed`. |
| Boutons “inline” | Rich text contenant `{btn}` ou un seul lien | `NotionButton` | `parseButtonFromRichText` inspecte les annotations (ton gris ➝ `ghost`). Le label est le texte en dehors du token `{btn:variant}`. |

### 3.3 Collections, navigation & méta
| Type Notion | Données utilisées | Composant React | Règles de rendu / remarques |
| --- | --- | --- | --- |
| `collection_view`, `collection_view_page`, `child_database` | `collection_id`, `view_id`, `linked_db`, `child_database.title` | `NotionDatabase` ➝ `NotionCollectionView` | `renderCollectionBlock` récupère l’ID via props ou `resolveDatabaseIdFromBlock`. `basePath` hérite de `currentSlug`. `NotionCollectionView` tente KV puis Notion live; choix `gallery`/`list` selon `view` ou prop `cards`. |
| `table_of_contents` | ToC générée à l’avance | `NotionTableOfContents` | Cf. section 3.1. |
| `breadcrumb` | ToC | `NotionBreadcrumb` | Cf. section 3.1. |
| Inconnus / inline media non supportés | `MEDIA_BLOCKS` (`image`, `video`, `file`, `pdf`, `bookmark`, `embed`, `audio`) + tout autre type | `renderUnknown` ou `null` | Les medias inline déjà traités sont ignorés (`null`). Les autres types déclenchent `console.warn` (dev only) puis `NotionUnknown`. |

## 4. Contraintes techniques & points d’attention
- **Renderer asynchrone** (`Blocks.tsx`) : chaque block peut impliquer un fetch (collections, widgets). Toute nouvelle logique doit rester async-friendly pour ne pas casser `Promise.all`.
- **`__children` obligatoire** : la sync `pageBlocksDeep` ajoute `__children`. Toute manipulation des blocks doit préserver cette propriété pour garantir la récursion (`to_do`, `callout`, `toggle`, `columns`, `synced_block`…).
- **`groupLists`** : on s’appuie sur l’ordre d’origine. Ajouter un block “parasite” entre deux items casse la fusion (`groupLists` flush dès que le type change).
- **Table des matières** : `collectHeadings` scanne l’ensemble de l’arborescence. Modifier les IDs (`b-${id}`) ou les niveaux impacterait `NotionTableOfContents` et `Breadcrumb`.
- **Widgets** : `renderWidget` fonctionne côté serveur et/ou client selon le widget. Il faut toujours fournir un `storageKey` stable (`currentSlug` ou `widget-${block.id}`) pour conserver l’état (localStorage).
- **Collections** : `NotionCollectionView` repose sur `getDbBundleFromCache` (KV). En local sans KV, on retombe sur `fetchDatabaseBundle`, ce qui ajoute un coût réseau Notion (et nécessite des credentials). Toute évolution doit garder le fallback.
- **Métadonnées médias** : les attributs `__image_meta` (width, align…) sont injectés pendant la sync. Sans eux, `NotionImage` applique les defaults (`maxWidth` full, align center). Ne pas les muter côté renderer.
- **Styles globaux** : les composants Notion supposent l’existence des classes définies dans `globals.css` + `prose.css` (`learning-toggle`, `.callout-*`, `.rt-*`, `.prose-notion`). Une modification CSS doit rester cohérente pour éviter de dupliquer du style inline.
- **`renderMode` et `currentSlug`** : ces props sont passées à tous les appels récursifs (`Blocks`). `renderMode` différencie certains rendus (ex. learning “day” mode, même si peu utilisé). Toute nouvelle API doit propager ces props pour éviter des incohérences entre sections marketing vs learning.
- **Détection d’embed spéciaux** : `parseYouTube` accepte `youtu.be`, `/watch`, `/shorts/`, `/embed/` et nettoie le paramètre `t`. Les heuristiques Tally/Airtable/PDF reposent sur regex simples (`/tally\.so/i`). Ajouter d’autres cas demande de garder ces tests synchronisés pour `embed` et `bookmark`.
- **Sécurité** : `renderUnknown` n’échoue jamais (retourne `<NotionUnknown>`). En prod, pas de log pour limiter le bruit. Garder ce comportement pour éviter de casser le rendu complet en cas de nouveau type Notion.

> ✅ Cette cartographie couvre la compréhension demandée pour la Phase 1. Aucune modification visuelle ou technique n’a été effectuée.
