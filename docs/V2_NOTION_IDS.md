# Notion v2 — IDs des nouvelles DBs

Créées via MCP/curl le 2026-04-23. Parent page : "Espaces Impulsion" (`34b7fdb76b00801aa325e6c1ebdf808e`).

## DBs v2 (unifiées)

| DB | database_id | data_source_id | Description |
|---|---|---|---|
| **DB Programs** | `f503624f-ff66-4b43-80d2-e1c5cdcf67b5` | `599e2e0a-66cf-4e4f-817e-357776e81cc7` | Unified programs (async / sync / event) |
| **DB Units** | `9d7546bf-b207-4aa7-b197-716d4b2abb52` | `53b31da7-7d24-4637-af02-aa37488ee0b4` | Jours + modules fusionnés |
| **DB Steps** | `ce9bdf9f-6355-4e6a-a14e-129f8c5b4582` | `f2fc8d7e-cdc2-4378-9758-8955b5772db4` | Activités toutes confondues |

## DBs partagées (conservées telles quelles)

| DB | database_id | data_source_id |
|---|---|---|
| DB Instructors | `b93276c3-b149-4dce-87c7-6ccf86c9c14a` | `fc1fd143-3d05-44e2-a7b1-8d4e69cc4af7` |
| DB Cohortes | `2967fdb7-6b00-800d-b0c9-faa97ab986ab` | `2967fdb7-6b00-80cb-8624-000bf681f036` |

## DBs legacy (à archiver après migration validée)

| DB | database_id | Remplacée par |
|---|---|---|
| DB Hubs | `2867fdb7-6b00-80ee-b437-f45a7db23d48` | Programs (type=async) |
| DB Sprints | `2977fdb7-6b00-8045-8e17-c5f19f65ea5a` | Programs (type=sync) |
| [Hubs] Jours_DB | `2bc7fdb7-6b00-8075-8fd8-eb54dbe62494` | Units |
| [Sprint] Modules_DB | `2977fdb7-6b00-80a6-bb62-e0c9f41f8a1e` | Units |
| [Hubs] Activités_DB | `2bc7fdb7-6b00-80dc-84a0-e840f8bdfaef` | Steps |
| [Sprint] Activités_DB | `2977fdb7-6b00-80e3-ad8e-c2f5c19282f5` | Steps |

## Schema Programs

| Property | Type | Notes |
|---|---|---|
| Title | title | |
| slug | rich_text | URL slug unique |
| type | select | `async` / `sync` / `event` |
| description | rich_text | Pitch court |
| publishing_status | select | `draft` / `published` / `archived` |
| visibility | select | `public` / `private` |
| password | rich_text | Gate cookie |
| cover_image | files | |
| thumbnail | files | |
| instructors | relation | dual → DB Instructors |
| estimated_duration_minutes | number | |
| target_audience | rich_text | |
| prerequisites | rich_text | |
| learning_outcomes | rich_text | |
| certificate_enabled | checkbox | |
| start_datetime | date | Pour `sync` / `event` |
| timezone | rich_text | Europe/Paris par défaut |
| capacity | number | Places max |
| cohorts | relation | dual → DB Cohortes (applicable si `type=async`) |
| units | relation | dual auto depuis Units.program |

## Schema Units

| Property | Type | Notes |
|---|---|---|
| Title | title | |
| slug | rich_text | |
| program | relation | dual → DB Programs |
| order | number | Position dans le programme |
| duration_minutes | number | |
| day_index | number | Pour events multi-jours |
| unlock_offset_days | number | Pour cohortes (schedule_mode=relative) |
| unlock_at | date | Pour unlock absolu |
| summary | rich_text | |
| objective | rich_text | |
| deliverable | rich_text | |
| access_tier | select | `free` / `paid` / `preview` |
| steps | relation | dual auto depuis Steps.unit |

## Schema Steps

| Property | Type | Notes |
|---|---|---|
| Title | title | Titre affiché |
| internal_id | rich_text | Identifiant interne |
| slug | rich_text | |
| unit | relation | dual → DB Units |
| order | number | |
| type | select | `intro` / `step` / `conclusion` / `option` |
| duration_minutes | number | |
| requires_check | checkbox | Nécessite validation apprenant |
| summary | rich_text | |

## Env vars v2 (à ajouter)

```bash
NOTION_PROGRAMS_DB=f503624f-ff66-4b43-80d2-e1c5cdcf67b5
NOTION_UNITS_DB=9d7546bf-b207-4aa7-b197-716d4b2abb52
NOTION_STEPS_DB=ce9bdf9f-6355-4e6a-a14e-129f8c5b4582
# NOTION_INSTRUCTORS_DB et NOTION_COHORTS_DB inchangés
```

## Env vars legacy (à dégager après migration OK)

```bash
# NOTION_HUBS_DB=2867fdb7...
# NOTION_SPRINTS_DB=2977fdb7...
# NOTION_WORKSHOPS_DB=... (déjà mort)
# NOTION_LEARNING_UNITS_DB=... (déjà mort)
# NOTION_LEARNING_ACTIVITIES_DB=... (déjà mort)
```
