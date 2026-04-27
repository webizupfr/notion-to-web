# 🚀 Guide de mise en production — Impulsion LMS

Ce guide te liste **tout ce que tu dois faire de ton côté** pour passer le projet en prod.
À suivre dans l'ordre — chaque étape coche une checklist.

---

## 📋 TL;DR — les 5 étapes critiques

1. **Créer les comptes externes** (Neon, KV, Resend, Cloudinary, Stripe, Upstash QStash) → §1
2. **Configurer la DB Notion + l'intégration** → §2
3. **Migrer la base Postgres** → §6 (⚠️ critique : la table `purchase` doit exister)
4. **Coller toutes les env vars dans Vercel** → §5
5. **Configurer le webhook Stripe** une fois le domaine en prod → §4.7

Chaque étape ci-dessous indique ce que tu dois faire et où copier les valeurs.

---

## 1. Comptes externes à créer

| Service | Lien | Plan suffisant | Rôle |
|---|---|---|---|
| **Neon** | https://console.neon.tech | Free tier OK | Postgres serverless |
| **Vercel KV** | Vercel dashboard → Storage | Free tier (Hobby) | Cache Notion |
| **Upstash QStash** | https://console.upstash.com/qstash | Free tier OK | Sync long-running |
| **Resend** | https://resend.com | Free tier (100 mails/jour) | Magic link + emails programme |
| **Cloudinary** | https://cloudinary.com | Free tier généreux | Mirror images Notion (sinon expirent en quelques h) |
| **Stripe** | https://dashboard.stripe.com | — | Paiements programmes payants |
| **Vercel** | https://vercel.com | Hobby OK | Hébergement + crons |

> 💡 **Ordre recommandé** : Neon + KV + QStash en premier (essentiels), Resend + Cloudinary ensuite, Stripe en dernier (peut être ajouté après le 1er deploy).

---

## 2. Notion — l'intégration et les DBs

### 2.1 Créer l'intégration

1. Va sur https://www.notion.so/my-integrations → **+ New integration**
2. Nomme-la "Impulsion sync" (ou autre)
3. Workspace : sélectionne ton workspace
4. Type : **Internal**
5. Capabilities : `Read content` + `Read user information without email` suffisent
6. Soumets → copie le **Internal Integration Secret** (commence par `ntn_...` ou `secret_...`)
   → c'est ta valeur `NOTION_TOKEN`

### 2.2 Récupérer les IDs des DBs

Pour chaque DB Notion utilisée, ouvre-la dans Notion → copie l'URL.
L'ID est la séquence de 32 caractères avant le `?` :

```
https://www.notion.so/workspace/abc123def456...000?v=...
                                ^^^^^^^^^^^^^^^^^^^^^^
                                  c'est ton ID
```

DBs à créer / connecter (cf. `.env.example` lignes 10-32) :
- `NOTION_PROGRAMS_DB` — la DB principale (programs unifiés v2) ⚠️ obligatoire
- `NOTION_PAGES_DB`, `NOTION_POSTS_DB` — pages statiques + blog
- `NOTION_INSTRUCTORS_DB`, `NOTION_COHORTS_DB` — optionnels mais recommandés
- `NOTION_UNITS_DB`, `NOTION_STEPS_DB` — legacy, à laisser vides si non utilisés

### 2.3 Partager chaque DB avec l'intégration

Pour **chaque DB** :
- Ouvre la DB dans Notion
- En haut à droite : **... (menu)** → **+ Add connections** → choisis "Impulsion sync"
- Sans cette étape, l'API renvoie 404 sur la DB.

---

## 3. Neon Postgres

1. https://console.neon.tech → **Create project**
2. Region : `eu-central-1` (Francfort) ou `eu-west-2` (Londres) selon ton public
3. Postgres version : par défaut (16+)
4. Une fois créé → **Connection string** → copie la string `postgresql://...?sslmode=require`
   → c'est ta valeur `DATABASE_URL`

> ⚠️ Garde la string **avec `?sslmode=require`** sinon Drizzle plante.

---

## 4. Stripe — config détaillée

### 4.1 Créer le compte
- https://dashboard.stripe.com/register
- Active ton compte (vérification d'identité, IBAN — Stripe demande ces infos pour activer les paiements)

### 4.2 Récupérer les clés API (mode TEST d'abord)

- Dashboard → **Developers → API keys**
- Copie la **Secret key** : `sk_test_...` → c'est `STRIPE_SECRET_KEY`
- ⚠️ Ne mets **jamais** la clé publique côté serveur — on n'en a pas besoin (pas de Checkout côté client).

### 4.3 Mode test vs live

Pendant les premiers tests :
- Utilise `sk_test_...` en local + sur un déploiement Vercel preview
- Cartes de test : https://stripe.com/docs/testing → `4242 4242 4242 4242`, n'importe quelle date future, n'importe quel CVC

Quand tout marche :
- Repasse Stripe en mode **Live** (toggle en haut à gauche du dashboard)
- Récupère la **Live secret key** (`sk_live_...`)
- Mets-la dans Vercel **Production environment** uniquement

### 4.4 Pas de produits/prix à créer dans Stripe

Le code crée la session Checkout dynamiquement en lisant le `price` depuis Notion (cf. `src/app/api/checkout/start/route.ts`). Tu **n'as pas besoin** de créer des produits dans Stripe.

### 4.5 Configurer le webhook (CRITIQUE — sinon les achats ne donnent pas accès)

⚠️ **À faire APRÈS ton 1er déploiement Vercel** (il faut une URL stable) :

1. Stripe Dashboard → **Developers → Webhooks → + Add endpoint**
2. **Endpoint URL** : `https://ton-domaine.com/api/webhooks/stripe`
3. **Events to send** — sélectionne exactement ces 2 :
   - `checkout.session.completed`
   - `charge.refunded`
4. Click **Add endpoint**
5. Sur la page de l'endpoint créé → **Signing secret** → **Reveal** → copie `whsec_...`
   → c'est ta valeur `STRIPE_WEBHOOK_SECRET`
6. Ajoute la dans Vercel (Production) puis **redéploie** (les env vars ne sont pas hot-reloadées)

### 4.6 Tester le webhook en local (optionnel mais utile)

Stripe CLI — https://stripe.com/docs/stripe-cli :

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# → te donne un whsec_... à utiliser en local dans .env.local
```

---

## 5. Variables d'environnement Vercel

Dans Vercel → ton projet → **Settings → Environment Variables**.

Ajoute pour chaque ligne ci-dessous : **Name + Value + Environment** (Production + Preview, sauf si précisé).

> 💡 **Astuce** : copie tout le bloc en bas dans `.env.local` d'abord, fais marcher en local, puis copie-colle dans Vercel.

### 5.1 Notion (obligatoire)
```
NOTION_TOKEN=ntn_xxx
NOTION_PROGRAMS_DB=xxx
NOTION_PAGES_DB=xxx
NOTION_POSTS_DB=xxx
NOTION_INSTRUCTORS_DB=xxx     # facultatif
NOTION_COHORTS_DB=xxx         # facultatif
USE_RECORDMAP=1               # active les layouts avancés
NOTION_RECORDMAP_SHARE=public # nécessite "Share to web" sur les pages Notion
```

### 5.2 Database (obligatoire)
```
DATABASE_URL=postgresql://user:pass@host.neon.tech/dbname?sslmode=require
```

### 5.3 Auth (obligatoire)
```
AUTH_SECRET=<openssl rand -hex 32>     # voir Annexe A pour générer
AUTH_URL=https://ton-domaine.com       # même valeur que NEXT_PUBLIC_SITE_URL
AUTH_RESEND_KEY=re_xxx
AUTH_RESEND_FROM=noreply@ton-domaine.com   # domaine vérifié chez Resend
```

### 5.4 Stripe (obligatoire si tu vends des programmes)
```
STRIPE_SECRET_KEY=sk_live_xxx           # sk_test_... pour Preview
STRIPE_WEBHOOK_SECRET=whsec_xxx         # à récupérer après création du webhook
```

### 5.5 KV / QStash (obligatoire pour la sync Notion)
```
# Vercel KV — sont auto-injectées si tu connectes le store au projet, sinon :
KV_URL=redis://...
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=xxx
KV_REST_API_READ_ONLY_TOKEN=xxx

# QStash
QSTASH_TOKEN=eyXXX
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_xxx
```

### 5.6 Cloudinary (recommandé)
```
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

> Sans Cloudinary, les images Notion expirent toutes les ~3h. Indispensable en prod.

### 5.7 Site (obligatoire)
```
NEXT_PUBLIC_SITE_URL=https://ton-domaine.com    # PAS de slash final
SEO_NOINDEX=0                                   # 1 = noindex (par défaut), 0 = ouvert aux moteurs
```

### 5.8 Sync security (obligatoire)
```
CRON_SECRET=<openssl rand -hex 32>     # voir Annexe A
SYNC_FAILURE_WEBHOOK=                  # facultatif (Slack/Discord)
```

---

## 6. Migrations base de données

⚠️ **Étape critique** — sans cela, le webhook Stripe plante (la table `purchase` n'existe pas).

### 6.1 Première fois (création des tables)

```bash
# Depuis ton repo local, avec DATABASE_URL pointant sur la prod Neon
npm run db:migrate
```

Cela exécute les fichiers `drizzle/0000_*.sql` et `drizzle/0001_*.sql` :
- `user`, `account`, `session`, `verificationToken` (auth)
- `enrollment`, `progress` (LMS)
- `purchase` (Stripe — ajouté lors du dernier audit)

### 6.2 À chaque nouveau changement de schéma

```bash
npm run db:generate    # crée un nouveau fichier drizzle/000X_xxx.sql
npm run db:migrate     # applique la nouvelle migration
git add drizzle/ && git commit -m "db: ..."
```

### 6.3 Sanity check post-migration

```bash
npm run db:studio   # ouvre Drizzle Studio sur localhost:4983
```

Vérifie que les 7 tables existent : `account`, `enrollment`, `progress`, `purchase`, `session`, `user`, `verificationToken`.

---

## 7. Premier déploiement — étapes ordonnées

```
1. ✅ Tous les comptes externes créés (§1)
2. ✅ Intégration Notion + DBs partagées (§2)
3. ✅ Toutes les env vars copiées dans Vercel (§5) — SAUF STRIPE_WEBHOOK_SECRET (on l'ajoutera à l'étape 6)
4. ✅ Migration DB exécutée (§6.1)
5. 🚀 Push sur la branche `main` → Vercel déploie automatiquement
6. 🔗 Récupère l'URL Vercel finale (ou connecte ton domaine custom)
7. ⚙️ Crée le webhook Stripe (§4.5) avec cette URL → copie `whsec_...`
8. ➕ Ajoute STRIPE_WEBHOOK_SECRET dans Vercel
9. 🔁 Redeploy (Settings → Deployments → Redeploy le dernier sans cache)
10. 👤 Promote toi en admin (cf. §8.1)
11. 🧪 Smoke tests (§8)
```

---

## 8. Smoke tests post-deploy (à faire dans cet ordre)

### 8.1 Promote ton compte en admin
```bash
# Avec DATABASE_URL pointant sur la prod
npm run admin:promote -- ton@email.com
```

Connecte-toi via magic link → va sur `/admin/programs` → tu dois voir la table.

### 8.2 Sync initial des programmes
```bash
# Manuel : déclenche le sync Notion → KV
npm run sync:prod
```
Ou via l'UI : `/admin/programs` → bouton "Sync all".

Sur `/programs`, tes programmes Notion doivent apparaître.

### 8.3 Tester l'auth (magic link)
- `/login` → entre ton email
- Vérifie que tu reçois le mail Resend
- Click sur le lien → redirige sur `/my-learning`

### 8.4 Tester l'enrollment gratuit
- Choisis un programme `public` ou `unlisted` sans `price`
- Click "Démarrer le programme" sur la page programme
- Tu dois être enrollé → redirige vers la 1re unité

### 8.5 Tester l'achat Stripe (mode test)
1. Sur Vercel Preview, mets `STRIPE_SECRET_KEY=sk_test_...`
2. Choisis un programme avec `price` rempli dans Notion
3. Click "Acheter pour XX€" → arrive sur Checkout Stripe
4. Carte test : `4242 4242 4242 4242`, exp `12/34`, CVC `123`
5. Après paiement → tu reviens sur `/my-learning?success=1`
6. Vérifie dans Stripe Dashboard → Webhooks → ton endpoint → "Events" → `checkout.session.completed` doit être 200 OK
7. Vérifie dans Drizzle Studio → table `purchase` → ligne créée avec `paid_at` rempli
8. Vérifie qu'un email de bienvenue est arrivé (Resend)

### 8.6 Tester le partage d'un programme privé
- `/admin/programs` → click 🔗 Partager sur un programme private
- L'URL contient `?key=...` (le password embarqué)
- Ouvre cette URL en navigation privée → tu dois accéder au programme sans saisir de password

### 8.7 Vérifier les Vercel Crons
- Vercel Dashboard → ton projet → **Settings → Cron Jobs**
- 3 crons doivent être listés :
  - `/api/sync` à 3h UTC (sync legacy pages/posts)
  - `/api/sync/programs` à 6h UTC (sync programs)
  - `/api/emails/daily-unlocks` à 8h UTC (déverrouillages quotidiens)
- Click "Run" sur chacun → vérifie qu'ils passent en 200

---

## 9. Domaine custom (optionnel)

Si tu utilises un domaine custom (ex: `impulsion.studio`) :

1. Vercel → ton projet → **Settings → Domains → Add**
2. Suis les instructions DNS (CNAME / A record)
3. Une fois validé → mets à jour dans Vercel :
   ```
   NEXT_PUBLIC_SITE_URL=https://impulsion.studio
   AUTH_URL=https://impulsion.studio
   ```
4. Mets à jour le webhook Stripe → change l'URL → **génère un nouveau signing secret** → mets à jour `STRIPE_WEBHOOK_SECRET`
5. Resend : vérifie le domaine d'envoi (sinon les magic links seront envoyés depuis `onboarding@resend.dev` et limités)
6. Redeploy

---

## Annexe A — Générer les secrets

```bash
# AUTH_SECRET et CRON_SECRET (32 bytes hex)
openssl rand -hex 32
```

Ou en JavaScript :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Annexe B — Troubleshooting

| Symptôme | Cause probable | Fix |
|---|---|---|
| "Failed to query DB" sur `/admin` | `DATABASE_URL` manquant ou invalide | Vérifier `?sslmode=require` à la fin |
| Magic link reçu mais click → erreur | `AUTH_URL` ≠ `NEXT_PUBLIC_SITE_URL` | Aligner les deux dans Vercel |
| Magic link jamais reçu | `AUTH_RESEND_FROM` non vérifié chez Resend | Vérifier le domaine ou utiliser `onboarding@resend.dev` |
| Achat Stripe OK mais pas d'enrollment | Webhook Stripe pas configuré ou `whsec_` faux | Vérifier dans Stripe Dashboard → Webhooks → Events |
| Programmes Notion pas visibles | Sync pas fait OU intégration pas partagée avec la DB | `npm run sync:prod`, vérifier les "+ connections" Notion |
| Images Notion cassées au bout d'un moment | Cloudinary non configuré | Ajouter les 3 vars `CLOUDINARY_*` + re-sync |
| `/api/cron/*` retourne 401 | `CRON_SECRET` différent entre Vercel et le code | Vérifier la valeur, redéployer après changement |
| Build Vercel échoue : "Cannot find module" | Lockfile désynchronisé | `rm -rf node_modules package-lock.json && npm install`, push |
| 500 sur `/admin/users` | Migrations pas exécutées | `npm run db:migrate` |

---

## Annexe C — Commandes utiles

```bash
# Local dev
npm run dev                           # Next.js sur localhost:3000

# Sync Notion (manuel)
npm run sync                          # local
npm run sync:prod                     # prod
npm run sync:prod:force               # force re-fetch tout

# DB
npm run db:generate                   # générer migration depuis schema.ts
npm run db:migrate                    # appliquer migrations
npm run db:push                       # appliquer schema directement (dev seulement)
npm run db:studio                     # UI Drizzle Studio

# Admin
npm run admin:promote -- <email>      # passer un user en admin
npm run admin:list                    # lister les admins

# Health check (vérifie que toutes les vars + services répondent)
npm run health
```

---

## ✅ Checklist finale avant le 1er deploy

- [ ] Comptes Neon, KV, Resend, Cloudinary, Stripe, QStash créés
- [ ] Intégration Notion créée + DBs partagées
- [ ] DBs Postgres migrées (`npm run db:migrate` → 7 tables)
- [ ] Toutes les env vars dans Vercel (sauf `STRIPE_WEBHOOK_SECRET`)
- [ ] 1er déploiement Vercel réussi
- [ ] Webhook Stripe configuré → `STRIPE_WEBHOOK_SECRET` ajouté → redeploy
- [ ] Compte admin promu
- [ ] Sync initial fait → programmes visibles sur `/programs`
- [ ] Magic link auth testé end-to-end
- [ ] Achat Stripe testé en mode test → enrollment OK
- [ ] Domaine custom configuré (si applicable)
- [ ] `SEO_NOINDEX=0` quand prêt à indexer

🎉 Bonne mise en prod !
