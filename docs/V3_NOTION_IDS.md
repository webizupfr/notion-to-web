# Notion v3 — Structure simplifiée (1 DB + child pages)

**Refonte 2026-04-24** : on passe de 3 DBs (Programs + Units + Steps) à **1 DB Programs + child pages hiérarchiques** pour Units et Steps.

Parent page : "Espaces Impulsion" (`34b7fdb76b00801aa325e6c1ebdf808e`).

## DB active (v3)

| DB | database_id | URL |
|---|---|---|
| **🧩 DB Programs** | `34c7fdb7-6b00-8166-a36a-d433231dc04c` | https://www.notion.so/34c7fdb76b008166a36ad433231dc04c |

## DBs conservées (inchangées)

| DB | database_id |
|---|---|
| DB Instructors | `b93276c3-b149-4dce-87c7-6ccf86c9c14a` |
| DB Pages (marketing) | via NOTION_PAGES_DB |
| DB Posts (blog) | via NOTION_POSTS_DB |

## DBs v2 → à archiver après bascule vers v3

| DB | ID | Remplacée par |
|---|---|---|
| DB Programs v2 | `f503624f-ff66-4b43-80d2-e1c5cdcf67b5` | DB Programs v3 (nouvelle) |
| DB Units v2 | `9d7546bf-b207-4aa7-b197-716d4b2abb52` | child pages dans Programs v3 |
| DB Steps v2 | `ce9bdf9f-6355-4e6a-a14e-129f8c5b4582` | child pages dans Programs v3 |
| DB Cohortes | `2967fdb7-6b00-800d-b0c9-faa97ab986ab` | 🔥 supprimée (drip individuel à la place) |

## Schema DB Programs v3 — 12 propriétés

| Property | Type | Notes |
|---|---|---|
| Title | title | Nom du programme |
| slug | rich_text | URL slug unique |
| type | select | `async` / `sync` / `event` |
| visibility | select | `public` / `unlisted` / `private` |
| password | rich_text | Gate cookie (optionnel) |
| publishing_status | select | `draft` / `published` / `archived` |
| description | rich_text | Pitch court (card + OG) |
| cover_image | files | Hero |
| thumbnail | files | Card listing |
| certificate_enabled | checkbox | |
| instructors | relation | dual → DB Instructors |
| start_datetime | date | Uniquement pour `type=event` |

## Modèle de contenu (body d'un programme)

```
[Intro du programme — rich blocks Notion libres]

📌 Ressources du programme        ← callout = sidebar resources
   → Lien 1
   → Lien 2

📄 Unit 01 — Titre                 ← child page = unit
   ⚙️ Config                       ← callout optionnel
   • Durée : 45 min
   • Déverrouillage : J+0
   • Accès : gratuit
   
   [Intro contexte de la unit]
   
   📄 Step 1                       ← child page = step
     ⚙️ Config
     • Durée : 10 min
     • Type : intro
     
     [Blocs Notion du step + widget YAML si besoin]
   
   📄 Step 2
   📄 Step 3

📄 Unit 02 — Titre
📄 Unit 03 — Titre
```

## Callout ⚙️ Config — clés reconnues

| Clé | Valeurs | Défaut |
|---|---|---|
| Durée | `45 min`, `1h`, `1h30`, `90 min` | null |
| Déverrouillage | `J+0`, `J+7`, `immédiat`, `2026-05-15` | `J+{order-1}` |
| Accès | `gratuit`, `payant`, `aperçu` | `gratuit` |
| Type *(step)* | `intro`, `étape`, `conclusion`, `bonus` | `étape` |
| Validation requise *(step)* | `oui`, `non` | `non` |

## Env var à basculer

```bash
# Ancien (v2, à retirer quand v3 validé)
# NOTION_PROGRAMS_DB=f503624f-ff66-4b43-80d2-e1c5cdcf67b5
# NOTION_UNITS_DB=9d7546bf-b207-4aa7-b197-716d4b2abb52
# NOTION_STEPS_DB=ce9bdf9f-6355-4e6a-a14e-129f8c5b4582

# Nouveau (v3)
NOTION_PROGRAMS_DB=34c7fdb7-6b00-8166-a36a-d433231dc04c
```

`NOTION_INSTRUCTORS_DB` inchangé. `NOTION_COHORTS_DB` supprimé.
