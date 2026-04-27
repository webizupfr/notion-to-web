# 📘 Handover — Impulsion LMS

> **Pour le dev qui reprend le projet.** Lecture ~30-45 min pour avoir une compréhension complète + savoir où regarder pour ajouter / corriger / déployer.

**Dernière maj** : avril 2026
**Version** : v3 (post-Sessions 1-4)

---

## 1. 📍 Pitch en 30 secondes

**Impulsion** est une plateforme LMS (Learning Management System) où des entrepreneurs/freelances apprennent l'IA par la pratique via des programmes courts et concrets.

**Particularité** : le contenu pédagogique est entièrement géré dans **Notion** (CMS) et synchronisé vers une cache KV → un Next.js 15 sert l'app.

**Public** : entrepreneurs, indépendants, freelances, équipes métier en PME, curieux de l'IA.

**Modèle** : freemium — programmes gratuits + programmes premium (paiement Stripe one-shot, accès à vie).

---

## 2. 🧱 Stack & services externes

### Stack
- **Next.js 15** (App Router, Turbopack, Server Components, Server Actions)
- **TypeScript strict**
- **React 19**
- **Tailwind v4** + custom design tokens (oklch)
- **Drizzle ORM** + **Neon Postgres** (serverless)
- **NextAuth v5** (database sessions, magic link via Resend)
- **react-email** (templates emails)
- **@react-pdf/renderer** (certificats PDF)
- **recharts** (analytics charts admin)

### Services externes (tous configurés)
| Service | Rôle | Plan utilisé |
|---|---|---|
| **Vercel** | Hébergement + Cron jobs | Hobby |
| **Neon** | Postgres serverless | Free tier |
| **Upstash KV** | Cache Notion (bundles + programs) | Free tier |
| **Upstash QStash** | Background jobs (sync long-running) | Free tier |
| **Notion** | CMS pédagogique | Workspace standard |
| **Cloudinary** | Mirror images Notion (URLs S3 expirent) | Free tier |
| **Resend** | Magic link auth + emails transactionnels | Free tier (100 mails/jour) |
| **Stripe** | Checkout + invoices + codes promo | Pay-as-you-go |

> 🔑 Toutes les clés sont dans `.env.local` (et Vercel Settings → Environment Variables pour la prod). Voir `.env.example` pour la liste complète.

---

## 3. 🎯 Concepts métier

### Programme
Une formation complète. 3 types :
- **`async`** — chaque "Jour" se débloque progressivement (24h après le précédent)
- **`sync`** — Modules avec date de démarrage commune (cohort)
- **`event`** — Sessions ponctuelles (ateliers, talks)

Un programme a :
- Un `slug` (URL : `/programs/<slug>`)
- Un `type` (`async` / `sync` / `event`)
- Une `visibility` (`public` / `unlisted` / `private`)
- Un `password` (si `private`)
- Un `price` en EUR (0 ou null = gratuit, > 0 = paywall Stripe)
- `certificateEnabled` (true → l'apprenant peut télécharger un PDF en fin de programme)

### Unit (= "Jour" pour async, "Module" pour sync)
Une étape du programme. Stocké comme **child page** dans Notion sous le programme.
Champs : `title`, `slug`, `order`, `unlockOffsetDays`, `dayIndex`, `summary`.

### Step (= "Activité")
Une sous-étape d'une unit. Stocké comme **child page** d'une unit dans Notion.
Champs : `title`, `slug`, `type` (intro/exercise/conclusion/etc.), `durationMinutes`.

### Enrollment
L'inscription d'un user à un programme. 1 row par (`user`, `programType`, `programSlug`, `cohortSlug`).
Tracke : `enrolledAt`, `startedAt`, `completedAt`, `lastActivityAt`.

### Progress
L'état d'avancement d'un user sur une unit (ou step). Status : `unlocked` / `started` / `completed`.

### Purchase
Un achat Stripe d'un programme payant. Tracke : `amount`, `currency`, `stripeSessionId`, `invoiceUrl`, `refundedAt`.

### Certificate
Délivré quand un user complète 100% d'un programme avec `certificateEnabled = true`.
Stocké en DB (table `certificate`) avec un `code` public stable (format `IMP-XXXXXX-XXXX`).
Vérifiable publiquement sur `/cert/verify/<code>`.

---

## 4. 🏛️ Architecture — les flux principaux

### A. Sync Notion → KV (cron quotidien)

```
[Notion DBs]                 [Vercel Cron]                [App]
                                 │
   DB Programs v3 ◀──────────────┤ /api/sync/programs (6h UTC daily)
   DB Pages       ◀──────────────┤ /api/sync          (3h UTC daily)
   DB Posts       ◀──────────────┘
                                 │
                                 ▼
                          [Mirror images Cloudinary]
                                 │
                                 ▼
                          [Upstash KV cache]
                                 │
                                 ▼
                       Lecture par les routes app/(site)/*
```

**Endpoints clés** :
- `/api/sync` — sync DB Pages (pages statiques `/about`, `/cgv`, etc.) et DB Posts (blog)
- `/api/sync/programs` — sync DB Programs v3 (le cœur du LMS)
- `/api/sync/programs/[slug]` — sync ciblé d'un programme
- `/api/sync/trigger` + `/api/sync/worker` — pipeline async via QStash si besoin de >60s

### B. Auth flow

```
User entre email sur /login
       │
       ▼
NextAuth v5 (Resend provider)
       │ génère magic link (signed token, 24h validity)
       ▼
[Email envoyé via Resend] (template MagicLinkEmail)
       │
       ▼
User click → /api/auth/callback/resend?token=...
       │
       ▼
Session créée (database strategy, 30 jours)
Cookie __Secure-authjs.session-token (HTTPS) posé
       │
       ▼
Redirect vers /my-learning
```

**Note** : `sendVerificationRequest` est overridé dans `src/auth.ts` pour utiliser notre template react-email (au lieu du template texte par défaut de NextAuth).

### C. Achat programme payant

```
User → /programs/<slug> → click "Acheter pour 49€"
       │
       ▼
POST /api/checkout/start
       │
       ▼
Stripe Checkout Session créée
  - allow_promotion_codes: true (code promo)
  - invoice_creation: enabled (génère facture auto)
  - metadata: userId, programSlug, programType
       │
       ▼
Redirect Stripe → user paie
       │
       ▼
Stripe envoie webhook checkout.session.completed
       │
       ▼
POST /api/webhooks/stripe (signature vérifiée)
  1. Retrieve invoice.hosted_invoice_url + invoice_pdf
  2. INSERT INTO purchase (idempotent via stripe_session_id UNIQUE)
  3. INSERT INTO enrollment
  4. Email PurchaseConfirmationEmail (avec lien facture)
```

**Refund** : Stripe envoie `charge.refunded` → `markPurchaseRefunded()` → l'apprenant perd l'accès.

### D. Complétion programme + certificat

```
User complète sa dernière unit
       │
       ▼
POST /api/progress/complete
  1. UPDATE progress SET status='completed'
  2. UPDATE enrollment SET lastActivityAt=now(), completedAt=now() (si 100%)
  3. Si 100% complété :
     - Si certificateEnabled → getOrIssueCertificate() (idempotent)
       → Email CertificateReadyEmail (avec lien PDF + URL vérification)
     - Sinon → Email ProgramCompletedEmail
  4. INSERT INTO email_sent (idempotence : pas de doublon)
```

**PDF certificat** : généré à la volée par `/api/certificates/[slug]` avec `@react-pdf/renderer`. Le code est stable (sha256 de `userId+slug`). Page publique de vérification : `/cert/verify/[code]` (sans auth, anonymisation activable si besoin).

### E. Email triggers automatiques (crons)

```
Vercel Cron 5h UTC (= 7h Paris été) → /api/emails/session-reminders
       │
       ▼
Pour chaque programme sync/event avec startDatetime :
  - Si demain → SessionReminderEmail variant J-1
  - Si aujourd'hui → variant J0
  Idempotent via email_sent table
```

```
Vercel Cron 8h UTC → /api/emails/inactivity-relaunch
       │
       ▼
Enrollments avec lastActivityAt entre J-7 et J-14 → relance #1
Enrollments avec lastActivityAt entre J-14 et J-21 → relance #2
Au-delà : on stoppe (pas de spam)
```

---

## 5. 📂 Structure du repo

### Routes Next.js (App Router)

```
src/app/
├── (site)/                    Group public (avec AppHeader)
│   ├── layout.tsx            ← AppHeader + main wrapper
│   ├── page.tsx              ← Landing /
│   ├── [...slug]/page.tsx    ← Pages statiques (about, mentions, cgv, privacy)
│   ├── account/page.tsx      ← /account (profil + factures + certificats)
│   ├── blog/                 ← /blog + /blog/[slug]
│   └── programs/
│       ├── page.tsx          ← /programs (grille avec filtre Premium)
│       └── [slug]/
│           ├── page.tsx       ← Détail programme + paywall + EnrollButton
│           ├── [unitSlug]/    ← Page unit (jour / module)
│           └── r/[resourceSlug]/  ← Ressources pinnées d'un programme
│
├── admin/                     Admin only (requireAdmin guard)
│   ├── layout.tsx            ← Header admin avec nav
│   ├── page.tsx              ← Overview
│   ├── analytics/page.tsx    ← Dashboard analytics + charts
│   ├── users/                ← Gestion users + promotion admin
│   ├── programs/page.tsx     ← Liste programmes + Sync + CSV + Share
│   └── promos/page.tsx       ← Codes promo Stripe (lecture)
│
├── login/                     Auth pages (signin, verify)
├── my-learning/page.tsx       Dashboard apprenant
├── cert/verify/[code]/page.tsx  Page publique de vérification certificat
├── gate/                      Soft gate password (programmes private)
│
└── api/
    ├── auth/[...nextauth]/    NextAuth v5
    ├── checkout/start/        Crée Stripe Checkout Session
    ├── webhooks/stripe/       Reçoit Stripe events (signature vérifiée)
    ├── certificates/[slug]/   Génère PDF certificat (server-side)
    ├── progress/start/        Inscrit user au programme + email welcome
    ├── progress/complete/     Marque unit complétée + email cert si 100%
    ├── sync/                  Sync Notion (DB Pages + Posts)
    ├── sync/programs/         Sync DB Programs v3
    ├── sync/trigger/          Async via QStash
    ├── sync/worker/           Async worker
    ├── emails/
    │   ├── daily-unlocks/         Cron : déverrouillages async quotidiens
    │   ├── session-reminders/     Cron : J-1 et J0 sync programs
    │   └── inactivity-relaunch/   Cron : 7j + 14j inactifs
    ├── admin/
    │   ├── backfill-invoices/     Récup invoices Stripe rétroactives
    │   └── programs/[slug]/enrollments.csv/  Export CSV
    └── debug/                 Endpoints debug (admin only)
```

### Lib

```
src/lib/
├── auth (via auth.ts à la racine)
├── notion.ts                  Client Notion + retry + rate limit
├── notion-record.ts           RecordMap (layouts avancés)
├── programs.ts                Source de vérité programmes v3 (Notion → tree)
├── programs-kv.ts             Wrapper Upstash KV pour programs
├── content-store.ts           KV pour DB Pages / DB Posts
├── media.ts                   Mirror images (delegate to cloudinary.ts)
├── cloudinary.ts              Upload Cloudinary + cache via KV
├── cloudinary-url.ts          Transforms URL (f_auto, q_auto, w_X) ← perf images
├── stripe.ts                  Singleton Stripe client
├── base-url.ts                Detect prod URL (NEXT_PUBLIC_SITE_URL)
├── instructors.ts             Resolve instructors depuis Notion
├── program-nav.ts             buildDayEntriesFromProgram + unitLabelsFor
├── program-config.ts          Parser callout ⚙️ Config Notion
├── widget-parser.ts           Parser widgets YAML inline (markdown extension)
├── theme/tokens.css           Source of truth design tokens (couleurs, espaces)
├── admin/
│   ├── guard.ts               requireAdmin() pour pages
│   ├── api-guard.ts           requireAdminApi() pour API routes
│   └── analytics.ts           SQL aggregations pour /admin/analytics
└── db/
    ├── schema.ts              Tables Drizzle (users, enrollment, progress,
    │                          purchase, certificate, email_sent)
    ├── index.ts               Drizzle client (Neon HTTP driver)
    ├── progress.ts            CRUD enrollment + progress
    ├── purchases.ts           CRUD purchases + paywall guard
    ├── certificates.ts        Idempotent certificate emission
    └── email-sent.ts          Idempotence triggers emails
```

### Composants

```
src/components/
├── certificates/CertificateDocument.tsx   PDF react-pdf (paysage A4)
├── emails/                    Templates react-email (8 templates)
│   ├── _layout/               EmailLayout, Brand, Button
│   ├── MagicLink.tsx
│   ├── PurchaseConfirmation.tsx
│   ├── EnrollmentWelcome.tsx
│   ├── CertificateReady.tsx
│   ├── ProgramCompleted.tsx
│   ├── SessionReminder.tsx    (variants J-1 et J0)
│   └── InactivityRelaunch.tsx (variants 1 et 2)
├── notion/                    Renderer Notion blocks
│   ├── Blocks.tsx             Mapping universel
│   └── ui/                    Composants spécifiques (NotionImage, NotionCallout, etc.)
├── widgets/                   Widgets pédagogiques (Brainstorm, PromptTemplate, etc.)
├── learning/                  Composants apprentissage (LearningHeader, ActivityContent, StepNavBar, StartToday, sectioning)
├── lms/                       Composants LMS (EnrollButton, PaywallCard, ProgramCardThumb, ProgramResources, CompletionToast, etc.)
├── admin/                     Composants admin (SyncAllButton, ShareButton, AnalyticsCharts, DateRangeFilter)
├── layout/                    AppHeader, Footer, PageSection, PageSidebar, Container
└── landing/                   TestimonialsSection (landing page)
```

---

## 6. 🔐 Variables d'environnement

> Voir aussi `.env.example` pour les valeurs placeholder.

| Variable | Rôle | Notes |
|---|---|---|
| `NOTION_TOKEN` | Auth Notion API | Obligatoire |
| `NOTION_PROGRAMS_DB` | DB Programs v3 (cœur) | Obligatoire |
| `NOTION_PAGES_DB` | DB Pages statiques | Obligatoire |
| `NOTION_POSTS_DB` | DB blog | Optionnel — si absent, blog skippé |
| `NOTION_INSTRUCTORS_DB` | DB Instructors | Optionnel |
| `NOTION_COHORTS_DB` | DB Cohorts | Optionnel |
| `USE_RECORDMAP=1` | Active layouts avancés Notion | Recommandé |
| `NOTION_RECORDMAP_SHARE=public` | Pages doivent être "Share to web" | Avec USE_RECORDMAP |
| `DATABASE_URL` | Neon Postgres | Obligatoire (LMS, auth, achats) |
| `KV_URL` / `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Upstash KV | Obligatoire (cache Notion) |
| `KV_REST_API_READ_ONLY_TOKEN` | Read-only KV | Obligatoire |
| `QSTASH_TOKEN` / `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | Background jobs | Obligatoire |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | Mirror images | Recommandé (images persistantes) |
| `AUTH_SECRET` | NextAuth signing | Obligatoire — `openssl rand -hex 32` |
| `AUTH_URL` | NextAuth callback | = `NEXT_PUBLIC_SITE_URL` |
| `AUTH_RESEND_KEY` | Resend API | Obligatoire |
| `AUTH_RESEND_FROM` | Email expéditeur | Domaine vérifié chez Resend |
| `STRIPE_SECRET_KEY` | Stripe API | `sk_test_...` ou `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Vérif signature webhook | Récupéré après création webhook Stripe |
| `CRON_SECRET` | Auth crons Vercel | `openssl rand -hex 32` |
| `NEXT_PUBLIC_SITE_URL` | URL prod | Sans slash final |
| `SEO_NOINDEX=1` | Block moteurs (par défaut 1) | `0` quand prêt à indexer |
| `SYNC_FAILURE_WEBHOOK` | Slack/Discord webhook | Optionnel mais recommandé en prod |

---

## 7. 🛠️ Workflow dev

### Setup local (1ère fois)

```bash
git clone <repo>
cd notion-publisher
npm install
cp .env.example .env.local
# remplis .env.local avec tes vraies clés (cf. SETUP.md)
npm run db:migrate         # applique les migrations Drizzle
npm run dev                # localhost:3000
```

### Commandes utiles au quotidien

```bash
npm run dev                # serveur dev avec Turbopack
npm run build              # build prod (TS + lint inclus)
npm run lint               # ESLint seul
npx tsc --noEmit           # type-check seul

# Email preview (preview tous les templates en local)
npm run email:dev          # localhost:3001

# DB
npm run db:studio          # Drizzle Studio (UI navigue les tables)
npm run db:generate        # Génère migration depuis schema.ts
npm run db:migrate         # Applique migrations en attente
npm run db:push            # Sync direct schema → DB (dev only, pas de migration file)

# Sync Notion manuel
npm run sync               # /api/sync/trigger en local
npm run sync:prod          # idem mais sur la prod

# Admin
npm run admin:promote -- email@example.com   # passe un user en admin
npm run admin:list                            # liste admins

# Health check (vérifie env vars + connexions externes)
npm run health
```

### Comment ajouter une feature ?

| Feature type | Où coder |
|---|---|
| Nouvelle route publique | `src/app/(site)/...` |
| Nouvelle route admin | `src/app/admin/...` + ajouter au layout admin nav |
| Nouvelle table DB | `src/lib/db/schema.ts` puis `npm run db:generate` puis `db:migrate` |
| Nouveau template email | `src/components/emails/X.tsx` (avec `PreviewProps`) |
| Nouveau cron | endpoint `/api/...` + ajout dans `vercel.json` (pattern `0 X * * *`) |
| Nouveau widget Notion | `src/components/widgets/X.tsx` + register dans `widget-parser.ts` |
| Nouveau type de programme | `programTypeEnum` dans schema.ts + `unitLabelsFor` |
| Modif design (couleurs/spaces) | `src/lib/theme/tokens.css` (single source of truth) |

### Comment debug ?

1. **Erreur 500 en prod** : Vercel Dashboard → Functions → Logs → cherche le path
2. **Webhook Stripe échoue** : Stripe Dashboard → Webhooks → Events → click sur l'event → onglet "Webhook attempts"
3. **Sync ne ramène pas X programme** : Notion → vérifie l'intégration "Connections" sur la DB + le programme. Force avec `npm run sync:prod:force`
4. **Email pas reçu** : Resend Dashboard → Emails → cherche par destinataire. Vérifie `email_sent` table (peut-être déjà envoyé une fois)
5. **Cookie session perdu** : check cookies du browser, vérifier `__Secure-authjs.session-token` (HTTPS prod) vs `authjs.session-token` (HTTP local)

---

## 8. 🚀 Workflow prod

### Premier déploiement
Suis `DEPLOY.md` pas-à-pas (~30 min) :
1. Comptes externes (Neon, Resend, Stripe, etc.)
2. Variables d'env dans Vercel
3. Migration DB Neon
4. Premier deploy
5. Webhook Stripe (avec URL prod)
6. Smoke tests

### Releases suivantes
1. **Si schema.ts a changé** : `DATABASE_URL=...prod... npm run db:migrate` AVANT le push
2. `git push` → Vercel auto-deploy
3. Suis `POST_DEPLOY_CHECKLIST.md` (smoke tests sélectifs selon ce que touche le commit)

### Monitoring
- **Vercel Dashboard** → Functions → Logs (errors récentes)
- **Stripe Dashboard** → Events (achats, refunds, webhooks)
- **Resend Dashboard** → Emails (bounce rate, delivery)
- **Neon Dashboard** → Operations (connections, slow queries)
- **Vercel Cron Jobs** → Settings → Cron Jobs (5 crons : sync, sync/programs, daily-unlocks, session-reminders, inactivity-relaunch)

---

## 9. ⚠️ Limites connues / TODO

### À faire si tu reprends
- [ ] **Mapping `learningOutcomes` dans ProgramMeta** (`src/lib/programs.ts`) → activera la section "Compétences validées" sur les certificats. 5min de code.
- [ ] **Pagination /admin/promos** si > 100 codes (actuellement limit 100 sans pagination)
- [ ] **Materialized views Postgres** si la DB grossit (>100k enrollments) pour speed up `/admin/analytics`
- [ ] **Tests automatisés** (Playwright) sur les flows critiques : signup, achat, accès programme, certificat
- [ ] **Sentry** (ou autre) pour error tracking en prod (aujourd'hui seulement console.log)
- [ ] **SEO Sprint** quand prêt à indexer : metadata par page, OG dynamique, JSON-LD, puis `SEO_NOINDEX=0`

### Limites connues
- **Sync Notion** : durée 60s+ pour ~5 programmes. Si tu dépasses, le cron Vercel a un timeout 300s. Au-delà, faut paralléliser plus.
- **Magic link** : un user peut perdre sa session en switchant de browser (le cookie ne suit pas). Pas de "remember me" cross-device.
- **Refund** : Stripe `charge.refunded` révoque l'enrollment mais ne supprime pas le certificate (visible publiquement comme "valide"). À renforcer en marquant `certificate.revokedAt`.
- **Cohorts** : code partiellement nettoyé (Ménage 4) mais des résidus existent. Si tu fais des programmes sync avec multiples cohorts, vérifie le flow.
- **Régénération PDF certificat** : à chaque téléchargement, le PDF est re-généré (pas mis en cache). Pour ~100 cert/jour c'est OK, mais pourrait être cached dans KV avec TTL si scale.

### Pièges connus
- **Migrations DB oubliées** : si tu push un changement de `schema.ts` sans migrate la prod → 500 sur les routes touchées. Toujours `npm run db:migrate` avant push prod.
- **Webhook Stripe URL** : doit être `/api/webhooks/stripe` (pas juste `/`). Stripe ne valide pas l'URL → silent fail si mauvaise.
- **`NEXT_PUBLIC_SITE_URL`** : doit ne PAS avoir de slash final (`https://app.impulsion.studio`, pas `https://app.impulsion.studio/`).
- **react-pdf fonts** : ne supporte pas `Helvetica-Bold` + `fontStyle: italic`. Utiliser directement `Helvetica-BoldOblique` (ou `Helvetica-Oblique`).
- **Cookies NextAuth en prod** : nom = `__Secure-authjs.session-token` (préfixe Secure HTTPS). Le middleware check les 2 noms.

---

## 10. 📚 Documentation associée

| Fichier | Quoi | Quand lire |
|---|---|---|
| `HANDOVER.md` (ce doc) | Vue d'ensemble + concepts | Premier jour |
| `SETUP.md` | Setup initial pour un nouveau client / fork | Si tu démarres une nouvelle instance |
| `DEPLOY.md` | Guide de mise en production étape par étape | Premier déploiement |
| `POST_DEPLOY_CHECKLIST.md` | Smoke tests à dérouler après chaque release | Chaque deploy |
| `DESIGN.md` | Système de design (tokens, composants, conventions) | Avant de toucher au visuel |
| `CODEBASE_REFERENCE.md` | (partiellement obsolète, post-Ménage 4) | Plutôt voir ce HANDOVER |
| `.env.example` | Liste de toutes les env vars | Setup |

---

## 11. 🆘 Contacts / accès

- **Compte Stripe** : connexion via le compte Impulsion
- **Compte Resend** : pareil
- **Compte Vercel** : `webizups` org sur Vercel
- **Notion workspace** : "Espaces Impulsion" (page racine)
- **Neon project** : voir Vercel Settings ou Neon dashboard
- **Domaine** : `impulsion.studio` (DNS chez le registrar du fondateur)

**Owner principal** : Arthur Maréchaux (Fondateur d'Impulsion).
Pour les questions techniques liées au code, rejouer la genèse via les commits Git (l'historique est explicite, organisé en "Sessions").

---

## 12. 🎓 Pour aller plus loin

### Lecture recommandée (dans cet ordre)
1. Ce doc (`HANDOVER.md`) — 30 min
2. `src/app/(site)/programs/[slug]/page.tsx` — comment une page programme s'affiche (paywall, enrollment, units)
3. `src/lib/programs.ts` — comment Notion → ProgramTree
4. `src/app/api/webhooks/stripe/route.ts` — flow d'achat complet
5. `src/lib/db/schema.ts` — modèle de données

### Boucler la connaissance
Lance le projet en local + fais 5 actions :
- Magic link login
- Inscription à un programme gratuit → reçois email
- Achat programme payant test (Stripe test mode + carte 4242…) → vérifie email + facture
- Force-complete un programme dans Drizzle Studio → reçois email cert + télécharge PDF
- Visite `/cert/verify/<code>` en navigation privée

Si ces 5 actions marchent → tu maîtrises 90% du système.

---

**Bon code 🚀 Si tu lis ça et que tu reprends le projet, ne sois pas timide — tout est là pour t'aider à aller vite.**
