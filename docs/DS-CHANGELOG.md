# DS-CHANGELOG

## Chapitre 4.1 – Librairie Notion (Impulsion)
- Création d’une librairie complète `src/components/notion/ui/*` (RichText, NotionHeading/Paragraph/List/Todo/Callout/Toggle, Quote, Divider, Columns, Table, Code, Equation, TOC, Breadcrumb, Media: Image/Video/Audio/Embed/Bookmark/File, Database inline).
- Router `src/components/notion/Blocks.tsx` épuré : mapping type → composant UI, fallback `UnknownBlock` avec log warn en dev.
- Couverture de la page Notion-test universelle (tous blocs standards) ; fallback explicite pour blocs inconnus/child_page.
- Rendu aligné Design System (tokens pour couleurs/radius/spacing/shadows), tables scrollables, colonnes responsives.
- QA : page Notion-test pour valider que chaque bloc est routé (aucun warning React/keys).

## Chapitre 4.2 – DA Impulsion (V1)
- Mise à jour des tokens dans `src/lib/theme/tokens.css` selon la fiche DA (primary ambre, bg/bg-card/bg-soft, fg/muted, radius s/m/l/xl, shadows s/m/l, spacing xs→2xl).
- `globals.css` aligne la palette, les surfaces (`.surface-card`) et les boutons `.btn` (primary/secondary) sur les tokens Impulsion, avec hover doux + shadow m→l.
- @theme inline mappé sur les nouveaux radius/shadows/spacings ; accent aliasé sur `--primary-soft` pour compatibilité.

## Chapitre 4.5 – QA & Cleanup Notion UI
- Tous les blocs Notion passent par `src/components/notion/Blocks.tsx` → `src/components/notion/ui/*` (Paragraph, Heading, Quote, List, ToDo, Callout, Toggle, Media, Bookmark, Code, Equation, Table, Columns, TOC, Breadcrumb, Database, Unknown).
- Styles Notion legacy (.prose-activity, ancienne grille) marqués LEGACY ou supprimés ; prose centralisée dans `src/lib/theme/prose.css`.
- Keys stables (block.id/group id) sur toutes les listes pour supprimer les warnings React.
- Page /design1 utilisée comme QA universelle : tous les blocs standard affichés, fallback Unknown pour types non gérés.
