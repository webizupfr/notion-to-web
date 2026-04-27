# Guide Créateur — Lancer ton instance en 30 min

Ce guide s'adresse à un coach / formateur / créateur qui veut déployer sa propre instance de la plateforme pour héberger ses programmes (parcours, challenges, ateliers, sprints privés).

**Ton rôle** : créer du contenu dans Notion. La plateforme le transforme en expérience LMS — inscription, progression, certificats.

---

## ✅ Ce dont tu auras besoin

| Service | Usage | Plan gratuit suffit ? |
|---|---|---|
| **Notion** | Source de vérité du contenu | ✅ |
| **Vercel** | Hébergement + cron daily | ✅ (Hobby) |
| **Neon Postgres** | DB users + progression + enrollments | ✅ (Free tier) |
| **Upstash Redis** | Cache KV (contenu des programmes) | ✅ (Free tier) |
| **Resend** | Emails (magic link auth + notifications) | ✅ (3k/mois gratuit) |
| **Cloudinary** (optionnel) | Images mirrors | ✅ |

Compte ~15 min pour créer tous ces comptes si tu pars de zéro.

---

## 🚀 Setup en 5 étapes

### 1. Cloner le repo

```bash
git clone <repo-url> my-lms
cd my-lms
npm install
```

### 2. Dupliquer le template Notion

**👉 [Lien de duplication du template à insérer ici](https://www.notion.so/TODO-partager-le-template)**

> **Note au propriétaire de l'instance** : tu dois partager publiquement le template depuis Notion. Ouvre la page parent *"Espaces Impulsion"*, clique "Partager" → "Publier sur le web" → "Autoriser la duplication". Copie l'URL et remplace ci-dessus.

Le template contient :
- 📊 **DB Programs** avec 1 programme demo déjà rempli
- 📊 **DB Instructors** (2 instructeurs fictifs)
- Un programme "Challenge IA" complet pour démarrer

### 3. Connecter Notion à ta plateforme

1. Va sur https://www.notion.so/profile/integrations
2. Crée une **nouvelle intégration privée** ("Impulsion LMS" ou ton nom)
3. Copie le **Internal Integration Token** (`secret_...`)
4. Dans Notion, sur ta page dupliquée : clique **"…" (menu) → Connexions → ajoute ton intégration**
5. Note les **IDs des DBs** (dans l'URL ou via le partageable)

### 4. Configurer les variables d'environnement

Crée `.env.local` :

```bash
# ─── Notion ───
NOTION_TOKEN=secret_xxxxx
NOTION_PROGRAMS_DB=xxxxx-xxxx-xxxx
NOTION_INSTRUCTORS_DB=xxxxx-xxxx-xxxx
NOTION_PAGES_DB=xxxxx-xxxx-xxxx    # optionnel (pages marketing)
NOTION_POSTS_DB=xxxxx-xxxx-xxxx    # optionnel (blog)

# ─── Database (Neon) ───
DATABASE_URL=postgres://user:pwd@xxx.neon.tech/neondb

# ─── Cache KV (Upstash) ───
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxxxx
KV_REST_API_READ_ONLY_TOKEN=xxxxx

# ─── Auth (NextAuth + Resend) ───
AUTH_SECRET=$(openssl rand -base64 32)
AUTH_RESEND_KEY=re_xxxxx
AUTH_RESEND_FROM=noreply@tondomaine.fr
NEXTAUTH_URL=http://localhost:3000   # en dev
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# ─── Cron ───
CRON_SECRET=$(openssl rand -base64 32)

# ─── Cloudinary (optionnel) ───
# CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...
```

### 5. Initialiser la base de données

```bash
npm run db:push     # applique le schéma Drizzle à Neon
npm run health      # vérifie que tout est bien branché
```

Si `npm run health` affiche ✅ partout → tu es prêt.

---

## 📝 Créer ton premier programme

1. **Ouvre ta DB Programs dans Notion**.
2. **Duplique le programme demo** (clic droit → "Dupliquer") et renomme-le.
3. Modifie ses propriétés :
   - `title` : nom de ton programme
   - `slug` : URL-safe (ex: `challenge-productivite`)
   - `type` : `async` / `sync` / `event`
   - `visibility` : `public` / `unlisted` / `private`
   - `publishing_status` : `draft` (tant que tu rédiges), puis `published`
4. **Édite le contenu** dans le corps de la page Notion :
   - Intro + description (blocs Notion classiques)
   - 📌 **Callout pinned** pour les ressources → apparaîtront dans la sidebar de la plateforme
   - **Child pages** pour chaque jour/module (Unit)
     - Dans chaque unit : optionnel ⚙️ Config + contenu
     - Et des child pages pour chaque étape (Step)

### Syntaxe du callout ⚙️ Config

Ajoute un callout (emoji ⚙️) en tête de page pour personnaliser une unit ou un step :

**Sur une Unit :**
```
⚙️ Config
• Durée : 45 min
• Déverrouillage : J+7
• Accès : gratuit
```

**Sur un Step :**
```
⚙️ Config
• Durée : 15 min
• Type : intro
• Validation requise : oui
```

| Clé | Valeurs | Défaut |
|---|---|---|
| Durée | `45 min`, `1h`, `1h30`, `90 min` | non défini |
| Déverrouillage | `J+0`, `J+7`, `immédiat`, date `2026-05-15` | `J+(ordre-1)` |
| Accès | `gratuit`, `payant`, `aperçu` | `gratuit` |
| Type *(step)* | `intro`, `étape`, `conclusion`, `bonus` | `étape` |
| Validation requise *(step)* | `oui`, `non` | `non` |

→ Si tu ne mets pas de callout ⚙️, tout fonctionne avec des défauts intelligents.

### Ressources épinglées

Dans le body du programme, ajoute un callout 📌 :

```
📌 Ressources du programme
• Workbook PDF
• Replay kick-off
• Rejoindre la communauté Slack
```

Ces éléments apparaîtront dans la sidebar en lecture apprenant.

---

## 🔄 Syncer Notion → plateforme

### Option A — Admin UI (recommandé)
Va sur `/admin/programs` → bouton **"🔄 Synchroniser Notion"** (global) ou 🔄 sur chaque ligne.

### Option B — Cron daily automatique
Sans intervention, la plateforme re-sync automatiquement **chaque jour à 6h UTC** (via Vercel Cron).

### Option C — Dev local

```bash
curl -X POST http://localhost:3000/api/sync/programs \
  -H "Cookie: authjs.session-token=..."
```

---

## 👥 Gestion des utilisateurs

### Se créer le premier admin

```bash
npm run admin:list                               # liste tous les users
npm run admin:promote -- ton@email.com          # te promeut admin
```

Prérequis : tu dois t'être connecté au moins une fois via `/login`.

### Inscrire un apprenant

Actuellement, l'apprenant s'inscrit lui-même :
1. Va sur `/programs/[slug]`
2. Clique **"Rejoindre le programme"**
3. Entre son email → reçoit un lien magique
4. Se connecte → inscrit automatiquement

---

## 🚢 Déployer sur Vercel

1. **Push** ton repo sur GitHub
2. Crée un projet Vercel depuis ce repo
3. Ajoute **toutes les env vars** (copie depuis `.env.local`)
   - ⚠️ Met à jour `NEXTAUTH_URL` et `NEXT_PUBLIC_SITE_URL` avec le domaine de prod
4. **Deploy** → c'est live.
5. Configure ton domaine personnalisé (optionnel).

Le cron daily `/api/sync/programs` tourne automatiquement à 6h UTC.

---

## 🐛 Débugger

| Problème | Solution |
|---|---|
| `/programs` est vide alors qu'il y a des programmes Notion | Clique "Synchroniser Notion" dans `/admin/programs`. Vérifie le `publishing_status` et la `visibility`. |
| Page de programme blanche / slow | Premier chargement = fallback Notion direct (~15s). Les suivants sont instantanés via KV. |
| Login ne marche pas | Vérifie `AUTH_RESEND_KEY` + `AUTH_RESEND_FROM`. L'email doit être un domaine vérifié chez Resend. |
| L'apprenant n'est pas admin alors qu'il devrait | `npm run admin:promote -- son@email.com` |
| Callout ⚙️ Config ignoré | Vérifie l'emoji (⚙️ avec VS16, pas un simple ⚙) + que c'est bien un callout Notion (/callout). |
| Certificat PDF : bouton manquant | Le programme doit avoir `certificate_enabled` coché + l'user doit avoir complété 100% des units. |

Run `npm run health` pour diagnostiquer la config.

---

## 🧰 Commandes utiles

```bash
npm run dev                 # dev server
npm run build               # build prod
npm run db:push             # applique le schéma Drizzle
npm run health              # check config (env, DB, Notion, KV)
npm run seed:demo           # crée un programme demo dans Notion
npm run admin:list          # liste les users en DB
npm run admin:promote -- email@example.com
```

---

## 📚 Pour aller plus loin

- `docs/V3_NOTION_IDS.md` : détails techniques du modèle de données
- `docs/README.md` : architecture générale
- Issues GitHub : questions / bugs

**Bon launch ! 🚀**
