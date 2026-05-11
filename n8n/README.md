# 🤖 Agent Architect Pédagogique — n8n + Claude + Notion

Workflow n8n qui prend du contenu brut (PDF, texte, brief) et génère un programme complet dans Notion (page programme + units + steps + contenu rédigé).

---

## 📦 Contenu du kit

```
n8n/
├── README.md                    Ce fichier — guide de setup
├── workflow.json                À importer dans n8n
├── prompts.md                   Les 3 prompts Claude (à coller dans les nodes)
├── notion-config.md             Format exact des callouts ⚙️ Config attendus par l'app
├── brief-template.md            Template de brief à fournir à l'agent
└── examples/
    ├── input-pdf-example.txt    Exemple de contenu source
    └── expected-output.md       Résultat attendu (programme structuré)
```

---

## 🚀 Setup en 30 minutes

### 1. Prérequis

- ✅ Un compte n8n (cloud ou self-hosted)
- ✅ Une **clé API Anthropic** : https://console.anthropic.com/settings/keys
- ✅ Un **token d'intégration Notion** : déjà fait (`NOTION_TOKEN` dans `.env.local`)
- ✅ L'**ID de ta DB Programs v3** : `34c7fdb7-6b00-8166-a36a-d433231dc04c`

### 2. Importer le workflow

1. n8n → **Workflows** → **+ Add workflow** → **Import from File**
2. Sélectionne `workflow.json`
3. Le workflow apparaît avec 9 nodes connectés

### 3. Configurer les credentials (1 par service)

**Anthropic** :
- Click sur n'importe quel node "Anthropic" → **Credential** → Create new
- API Key : `sk-ant-...`
- Save

**Notion** :
- Click sur n'importe quel node "Notion" → **Credential** → Create new
- Internal Integration Token : `ntn_...` (le même que `NOTION_TOKEN`)
- Save

> ⚠️ **N'oublie pas de partager la DB Programs avec ton intégration Notion** :
> Notion → DB Programs v3 → ⋯ → **+ Add connections** → ton intégration

### 4. Configurer les variables du workflow

Ouvre le node **"Set: Config"** (le 1er node après le Form Trigger) :

| Variable | Valeur |
|---|---|
| `notion_programs_db_id` | `34c7fdb7-6b00-8166-a36a-d433231dc04c` |
| `claude_model` | `claude-sonnet-4-5-20250929` (ou autre Sonnet) |
| `default_visibility` | `public` |
| `default_certificate_enabled` | `true` |

### 5. Vérifier les prompts (déjà inclus dans le workflow)

Les prompts sont déjà collés dans les 3 nodes `LLM Chain — X`. Si tu veux les ajuster :
1. Ouvre le node `LLM Chain — Analyse` (ou Architecte / Rédacteur)
2. Onglet **Parameters** :
   - **Text** = le prompt user (avec variables `{{ }}` n8n)
   - **Messages → System Message** = les instructions générales

Si tu veux personnaliser le ton / style, c'est dans `prompts.md` que tu trouveras les versions complètes annotées avec des conseils d'itération.

### 5bis. Vérifier le model Anthropic dans les sub-nodes

Pour chaque `Anthropic Model — X` (sub-node attaché au Chain) :
- **Model** : `claude-sonnet-4-5-20250929` (ou autre Sonnet récent dispo dans ton compte)
- **Max Tokens** : 1500 (Analyse) / 4000 (Architecte) / 4000 (Rédacteur)
- **Temperature** : 0.3 (Analyse) / 0.5 (Architecte) / 0.6 (Rédacteur)

> 💡 Si le model n'apparaît pas dans la liste, vérifie ton accès Anthropic. Tu peux passer en `claude-3-5-sonnet-20241022` ou `claude-haiku-4-5` selon ce qui est dispo.

### 6. Activer le workflow

- Toggle **Active** en haut à droite
- L'URL du Form Trigger apparaît : `https://<ton-instance>.n8n.cloud/form/<id>`
- C'est ton **point d'entrée** — bookmark-le

---

## 🧪 Test rapide

1. Ouvre l'URL du Form Trigger
2. Remplis le form :
   - **Audience** : "freelances qui veulent intégrer l'IA dans leur quotidien"
   - **Format** : "challenge async 5 jours"
   - **Niveau** : "intermédiaire"
   - **Business goal** : "lead magnet pour générer des leads qualifiés"
   - **Fichier** : upload `examples/input-pdf-example.txt` (ou ton propre brief)
3. Submit → tu attends ~30-60s
4. Va dans Notion → DB Programs v3 → tu dois voir un nouveau programme **status=draft**
5. Click dessus → tu vois la structure complète : units en child pages, steps en sub-children

---

## 🎯 Workflow

Le workflow utilise le pattern **LangChain n8n** : chaque "Claude call" est composé de 2 nodes :
- **`LLM Chain — X`** (le node principal qui contient le prompt)
- **`Anthropic Model — X`** (sub-node connecté en `ai_languageModel`)

```
[Form Trigger]
       │ POST avec fichier + metadata
       ▼
[Set: Config]                       ← variables centralisées
       │
       ▼
[Extract from File]                 ← PDF → texte
       │
       ▼
[LLM Chain — Analyse]               ← prompt 1 (analyse contenu)
       │ ← attaché : [Anthropic Model — Analyse] (sub-connection ai_languageModel)
       ▼
[Parse Analyse JSON]                ← clean + valide le JSON output
       │
       ▼
[LLM Chain — Architecte]            ← prompt 2 (squelette programme)
       │ ← attaché : [Anthropic Model — Architecte]
       ▼
[Parse Architecte JSON]
       │
       ▼
[Notion — Create Program Page]      ← HTTP POST /v1/pages (parent = database)
       │                              status=draft, props complètes
       ▼
[Split Units]                       ← itère sur chaque unit du squelette
       │
       ▼
[LLM Chain — Rédacteur]             ← prompt 3 (contenu détaillé de la unit)
       │ ← attaché : [Anthropic Model — Rédacteur]
       ▼
[Transform Blocks]                  ← Claude format → Notion API blocks + callout ⚙️
       │
       ▼
[Notion — Create Unit Page]         ← HTTP POST /v1/pages (parent = program page)
       │                              + callout ⚙️ Config (durée, déverrouillage)
       ▼
[Prepare Steps]                     ← prépare les requêtes par step
       │
       ▼
[Notion — Create Step Page]         ← HTTP POST /v1/pages (parent = unit page)
       │                              avec children blocks (callout ⚙️ + contenu)
       ▼
[Log Success]                       ← lien Notion vers le programme créé
```

**Total : 17 nodes** (3 paires LLM Chain + Model, 3 nodes Notion HTTP, 3 nodes Code, etc.)

---

## 📋 Workflow d'usage quotidien

1. **Tu as un brief / playbook / PDF source** → tu veux en faire un programme
2. **Ouvre le Form Trigger** (URL bookmarkée)
3. **Remplis le brief** (audience, format, niveau, business goal — voir `brief-template.md`)
4. **Upload le fichier** (PDF, .txt, .docx)
5. **Submit** → attends ~60s
6. **Notion ouvert** → tu vois le programme apparaître en draft
7. **Relis & raffine** :
   - Le titre te plaît ? Sinon édite
   - Les units sont dans le bon ordre ? Re-order
   - Le contenu rédigé est juste ? Édite à la marge
   - Tu ajoutes 1-2 callouts perso (anecdote, exemple client)
8. **Sync** : `/admin/programs` → bouton 🔄 Synchroniser
9. **Publish** : passe `publishingStatus` de `draft` → `published`
10. **C'est en ligne sur `/programs/<slug>`** → tu peux partager le lien et commencer à vendre

---

## ⚠️ Points d'attention

### Qualité de l'output
La qualité dépend à 80% de **la qualité du brief que tu donnes**. Si ton brief est flou, le résultat sera flou.

**Bons briefs** :
- Public précis : "freelances designers qui pitchent à des clients PME"
- Format précis : "challenge 3 jours, ~30min/jour, max 5 exercices"
- Niveau : "débutant absolu en IA, mais à l'aise avec le numérique"
- Business goal : "lead magnet pour mon offre coaching à 1500€"

**Mauvais briefs** :
- "Faire un truc sur l'IA" 
- "Pour des entrepreneurs"

### Coût estimé par programme
- Programme de 3 units : ~1,20€ Claude
- Programme de 5 units : ~1,80€ Claude
- Programme de 7 units : ~2,40€ Claude

→ Tu peux produire 50 programmes pour ~80€ d'Anthropic API. ROI immédiat dès 2 ventes.

### Limites connues
- **PDFs scanné** (image, pas texte) : le node `Extract from File` ne marche pas. Convertis en texte d'abord (OCR).
- **Brief en anglais** : marche aussi, l'output sera en français quand même (les prompts forcent le tutoiement français).
- **Très gros documents** (>50 pages) : risque de tronquer. Dans ce cas, fournis un résumé synthétique en input.

---

## 🔧 Customisation

### Changer le ton / style
Édite directement les prompts dans `prompts.md`. Les passages clés :
- **Prompt 2 — Architecte** : `"Le ton est inspirant mais sans bullshit. Tutoyer."`
- **Prompt 3 — Rédacteur** : sections `CONSIGNES DE RÉDACTION`

### Ajouter un trigger email
Au lieu du Form Trigger, utilise **Email Trigger (IMAP)** dans n8n :
- Tu envoies un PDF par email à `agent@impulsion.studio`
- Le sujet du mail = audience + format
- Le body = brief
- L'attachement = le contenu source

### Ajouter une étape "validation humaine"
Entre `[Claude — Architecte]` et `[Notion — Create]`, ajoute :
- Un node **Slack — Send approval message** avec les boutons "✅ Continue" / "❌ Cancel"
- Un node **Wait** qui attend la réponse
- Tu valides la structure proposée avant que le contenu soit rédigé (économise les Claude calls si tu rejettes)

---

## 🔗 Liens utiles

- **Anthropic API console** : https://console.anthropic.com
- **n8n docs** : https://docs.n8n.io
- **Notion API reference** : https://developers.notion.com/reference
- **Tarifs Claude** : https://www.anthropic.com/pricing#anthropic-api

---

## 🆘 Debug

| Symptôme | Cause probable | Fix |
|---|---|---|
| Form trigger renvoie 200 mais rien ne se passe | Workflow pas activé | Toggle "Active" en haut à droite |
| Claude renvoie un JSON invalide | Le prompt est mal collé / variable manquante | Vérifie que les `{{ ... }}` sont bien remplacés |
| Notion : "Could not find database with ID" | DB pas partagée avec l'intégration | Notion → DB → ⋯ → Connections |
| Notion : "Property X does not exist" | Schema DB Programs ne match pas (props manquantes) | Vérifie que la DB a toutes les props listées dans `notion-config.md` |
| Programme créé mais sans content | Claude Rédaction renvoie pas de blocks | Vérifie le format JSON output (souvent un escape mal fait) |
| Erreur 429 (rate limit) | Trop de calls Claude en // | Ajoute un node Wait entre les batches (1s suffit) |

---

🚀 **Tu es prêt à produire 1 programme par jour sans transpirer.**
