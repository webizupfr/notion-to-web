# 📘 Impulsion Academy — PRD complet & spec technique

> **Pour l'agent / dev qui reprend le chantier.** Ce document est self-contained : il contient la vision, le PRD, l'architecture cible, le plan de migration de la codebase actuelle, la roadmap par phases, les specs techniques détaillées, et tous les détails opérationnels (Stripe Connect, Notion OAuth, white-label, multi-tenancy).
>
> **Lecture estimée** : 60-90 min pour avoir une compréhension complète.
> **Périmètre** : transformation du LMS Impulsion (mono-tenant) en SaaS B2B (multi-tenant) → "Impulsion Academy".

**Version** : 1.0 (à ne pas démarrer le code avant validation finale)
**Auteur** : Arthur Maréchaux
**Statut** : phase vision/PRD — pas encore de code

---

## 📑 Table des matières

1. [Executive Summary](#1-executive-summary)
2. [Décisions actées](#2-décisions-actées)
3. [Vision & PRD](#3-vision--prd)
4. [Architecture cible](#4-architecture-cible)
5. [Modèle de données](#5-modèle-de-données)
6. [Stripe Connect Standard — spec détaillée](#6-stripe-connect-standard--spec-détaillée)
7. [Notion OAuth + duplication template — spec détaillée](#7-notion-oauth--duplication-template--spec-détaillée)
8. [Système White-label](#8-système-white-label)
9. [Plan de migration de la codebase actuelle](#9-plan-de-migration-de-la-codebase-actuelle)
10. [Roadmap solo dev (5 phases)](#10-roadmap-solo-dev)
11. [Backlog priorisé par phase](#11-backlog-priorisé-par-phase)
12. [Risques & mitigations](#12-risques--mitigations)
13. [GTM & plan beta](#13-gtm--plan-beta)
14. [Glossaire & conventions](#14-glossaire--conventions)
15. [Annexes](#15-annexes)

---

## 1. Executive Summary

### Le pitch

**Impulsion Academy** est une plateforme SaaS qui permet à n'importe quel coach / formateur / consultant de transformer son espace Notion en académie en ligne professionnelle (LMS) en moins de 30 minutes, sans coder.

### Le marché

- **Concurrents directs** : Teachable, Thinkific, Podia, Kajabi (gros SaaS LMS établis)
- **Concurrents Notion-based** : Super, Potion (transforme Notion en site, mais pas en LMS)
- **Différenciateur** : on positionne comme **"le seul LMS qui marche avec ton Notion existant"**, et on cible spécifiquement les coachs solos qui ont déjà du contenu Notion mais pas envie de migrer ailleurs.

### Le modèle économique

- **Plan unique : Creator 29€/mois** (au moins pour le MVP)
- **Pas de commission sur les ventes** (Stripe Connect Standard, l'argent va direct chez le coach)
- **Marge** : abonnement pur. Au volume, MRR de ~3000€/mois à 100 clients après 12 mois.

### La codebase de départ

L'app **Impulsion** existante (`notion-publisher`) est mature : sync Notion → KV cache → rendu LMS, paywall Stripe, certificats PDF, emails react-email, dashboard admin, analytics. **80% du code est portable tel quel** vers le SaaS, à condition de le scoper par `workspace_id`.

### Effort estimé

- **Solo dev, ~15h/semaine** : 4 mois pour avoir un produit en beta avec 5 testeurs
- **Premier paying customer** : mois 5-6
- **MRR > 1k€** : mois 8-10 (sous condition de plan GTM LinkedIn correct)

### Décisions structurantes

- ✅ **Stripe Connect Standard** (pas Express, pas BYO key)
- ✅ **Mono-repo Next.js** (route groups : `(marketing)`, `(app)`, `(tenant)`)
- ✅ **OAuth Notion** dès le MVP
- ✅ **Custom domain en Phase 4** (pas MVP)
- ✅ **Closed source**
- ✅ **Solo dev**
- ✅ **Nom : Impulsion Academy**

---

## 2. Décisions actées

Récap des décisions prises pendant la phase vision/PRD (à ne pas remettre en question sans raison forte).

| Sujet | Décision | Pourquoi |
|---|---|---|
| **Persona prioritaire** | Coachs solos | Marché plus large, friction d'achat plus faible |
| **Pricing** | 29€/mois (plan Creator unique) | Accessible pour solo, marge correcte |
| **Stripe** | Connect Standard sans commission | Pas de KYC chez nous, sécurité, simplicité OAuth |
| **Notion auth** | OAuth (pas BYO token) | Nécessaire pour scaling et UX propre |
| **Custom domain** | Phase 4 / post-MVP | Trop complexe pour MVP, pas bloquant pour vendre |
| **Equipe** | Solo dev | Side project, validation marché avant recrutement |
| **MVP scope** | Features actuelles d'Impulsion | Pas de quiz / pas de communauté / pas de mobile app |
| **Code source** | Closed source | Modèle SaaS classique |
| **Repo** | Mono-repo Next.js | Solo dev = simplicité avant tout |
| **Nom** | Impulsion Academy | Décidé par le fondateur |
| **Multi-tenancy** | Single-DB avec `workspace_id` | Industry standard à cette échelle (<10k tenants) |
| **Hébergement** | Vercel + Neon (continuité avec Impulsion) | On capitalise sur l'infra existante |

---

## 3. Vision & PRD

### 3.1 La vision en 1 phrase

> **Impulsion Academy** transforme le Notion d'un coach indépendant en académie en ligne professionnelle, monétisable et white-labelée, en moins de 30 minutes.

### 3.2 Persona prioritaire — "Le coach digital"

| Attribut | Valeur |
|---|---|
| **Tranche d'âge** | 30-50 ans |
| **Statut** | Indépendant, micro-entrepreneur, ou en transition de salarié |
| **Domaine** | Coaching pro, consulting, formation (sales, marketing, dev perso, leadership) |
| **Revenu actuel** | 30k-150k€/an, en grande partie via 1-1 |
| **Outils utilisés** | Notion (10/10), Calendly, Slack, Stripe, peut-être Substack |
| **Compétences tech** | 0-3/10. Sait copier-coller, pas écrire du code |
| **Budget outils** | 30-200€/mois |
| **Pain principal** | "J'ai du contenu pédagogique mais je ne sais pas comment le digitaliser/scaler" |
| **Recherche** | "LMS pour coach", "vendre ses programmes en ligne", "Notion + paiement" |

### 3.3 Job-to-be-done

> "Quand j'ai un programme rédigé dans mon Notion, je veux le transformer en académie en ligne professionnelle (avec inscription, paiement, suivi des apprenants, certificat de complétion), pour pouvoir le vendre à grande échelle, sans dépendre d'un dev ni quitter Notion comme outil de travail."

### 3.4 Features MVP (= adaptation de l'existant + onboarding)

#### A. Côté coach (dashboard `app.impulsion-academy.com`)

| Feature | Description | Source codebase |
|---|---|---|
| **Inscription / connexion** | Magic link via Resend | ✅ existe (`src/auth.ts`) |
| **Onboarding wizard** | 4 étapes : Notion connect → template duplicate → branding → first program | ❌ à créer |
| **Connexion Notion (OAuth)** | Le coach autorise Impulsion à lire son Notion | ❌ à créer |
| **Duplication template** | Bouton "Dupliquer le template Impulsion Academy" → crée DB Programs/Pages dans son workspace Notion | ❌ à créer |
| **Mapping DBs auto** | On détecte quelles DBs du user matchent les schémas attendus | ❌ à créer |
| **Création programmes** | Le coach crée ses programmes dans Notion, Impulsion les sync | ✅ existe (`src/lib/programs.ts`) |
| **Branding minimal** | Logo upload + 1 couleur primary | ❌ à créer |
| **Subdomain auto** | `<workspace-slug>.impulsion-academy.app` | ❌ à créer |
| **Stripe Connect onboarding** | OAuth Stripe → récupère `account_id` | ❌ à créer |
| **Plan SaaS Creator 29€/mois** | Stripe Subscription pour le coach | ❌ à créer |
| **Dashboard analytics** | Inscriptions, revenus, taux de complétion (scopé par workspace) | ✅ existe (`src/app/admin/analytics/page.tsx`) |
| **Export CSV apprenants** | Par programme | ✅ existe |
| **Codes promo Stripe** | Le coach crée ses codes dans son Stripe | ✅ existe (`/admin/promos`) |
| **Settings workspace** | Branding, Notion connection, Stripe, billing | ❌ à créer (page agrégateur) |

#### B. Côté apprenant (LMS public `<slug>.impulsion-academy.app`)

| Feature | Description | Source codebase |
|---|---|---|
| **Landing programmes** | Liste publique des programmes du coach | ✅ existe (`src/app/(site)/programs/page.tsx`) |
| **Page programme** | Détail, paywall, enroll | ✅ existe |
| **Magic link login** | Apprenant crée son compte | ✅ existe |
| **Achat Stripe** | Paiement → Stripe → webhook → enroll | ✅ existe (mais à adapter Connect) |
| **Espace apprenant `/my-learning`** | Dashboard de ses programmes | ✅ existe |
| **Profil `/account`** | Modif nom, factures, certificats | ✅ existe |
| **Page programme + units** | Sidebar, units, steps | ✅ existe |
| **Certificat PDF** | Téléchargeable à la fin | ✅ existe |
| **Page publique `/cert/verify/[code]`** | Vérification cert | ✅ existe |
| **Pages statiques (about, mentions, CGV, privacy)** | Notion-driven via `[...slug]` | ✅ existe |
| **Emails transactionnels** | Magic link, post-achat, certificat, etc. | ✅ existe (8 templates react-email) |
| **Email triggers** | Reminder J-1/J0, inactivité 7j/14j | ✅ existe (3 crons) |

### 3.5 Hors scope MVP (pour Phase 5+)

- ❌ Quizzes interactifs (avec scoring, feedback)
- ❌ Communauté intégrée (forum, chat) — alternative : embed Discord/Circle externe
- ❌ Custom domain (revient en Phase 4 polish)
- ❌ Plans Pro / Business (un seul plan Creator 29€)
- ❌ Multi-membres équipe (workspace = 1 owner)
- ❌ API publique
- ❌ Mobile app native
- ❌ Multi-langue (i18n) — FR uniquement
- ❌ Drip campaigns / sequences email avancées
- ❌ Integrations (Calendly, Mailchimp, etc.)

### 3.6 KPIs de succès du MVP

| Métrique | Objectif Mois 6 | Objectif Mois 12 |
|---|---|---|
| **Workspaces actifs (free)** | 50 | 300 |
| **Workspaces payants (Creator 29€)** | 5 | 50 |
| **MRR** | 145€ | 1 450€ |
| **Apprenants totaux (toutes plateformes)** | 100 | 1 000 |
| **Volume de ventes traité (chez les coachs)** | 5k€ | 50k€ |
| **Net Promoter Score** | > 30 | > 50 |
| **Taux de churn mensuel** | < 10% | < 5% |

---

## 4. Architecture cible

### 4.1 Vue d'ensemble — 3 surfaces, 1 codebase

```
┌─────────────────────────────────────────────────────────────────┐
│  Marketing Site (impulsion-academy.com)                         │
│  Cible : coachs cherchant un LMS                                │
│  - Landing, pricing, blog, login                                │
│  - Le seul "Impulsion Academy" public en marque blanche         │
│  Routes : src/app/(marketing)/*                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Coach signup → Stripe → workspace créé
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Dashboard SaaS (app.impulsion-academy.com)                     │
│  Cible : le coach, propriétaire du workspace                    │
│  - Settings, branding, billing                                  │
│  - Connexion Notion, mapping DBs                                │
│  - Création/gestion programmes                                  │
│  - Analytics                                                    │
│  - Onboarding wizard                                            │
│  Routes : src/app/(app)/*                                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          │ Coach publie son LMS
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│  LMS Tenant (<slug>.impulsion-academy.app)                      │
│  Cible : les apprenants du coach                                │
│  - Programmes du coach                                          │
│  - White-labelé : logo, couleurs, ton du coach                  │
│  - Achat via Stripe Connect (argent → coach)                    │
│  Routes : src/app/(tenant)/*                                    │
└─────────────────────────────────────────────────────────────────┘
```

**Décision clé** : route groups Next.js `(marketing)`, `(app)`, `(tenant)` permettent de partager la codebase tout en ayant des layouts/middlewares distincts.

### 4.2 Routing & resolution du workspace

```
Requête entrante
       │
       ▼
[Vercel Edge Middleware] (src/middleware.ts)
   1. Lit le hostname
   2. Détermine la surface :
      - hostname === "impulsion-academy.com" → (marketing)
      - hostname === "app.impulsion-academy.com" → (app), session requise
      - hostname.endsWith(".impulsion-academy.app") → (tenant)
      - hostname matche `workspace.custom_domain` → (tenant)
   3. Pour (tenant) : résolve le `workspace_id` depuis le hostname
      - Cache KV : `workspace:domain:<hostname>` (TTL 5min)
      - Fallback DB : SELECT * FROM workspace WHERE slug = ? OR custom_domain = ?
   4. Inject `x-workspace-id` header dans la requête
       │
       ▼
[App Router]
   - Server components lisent `x-workspace-id` via headers()
   - Helper `getWorkspaceContext()` retourne le workspace courant
       │
       ▼
[Drizzle queries]
   - Tous les helpers DB filtrent par `workspace_id`
   - Helper `withWorkspace(workspaceId)` qui wrap les queries
```

**Cas limites** :
- Hostname inconnu → page 404 marketing avec lien "Créer ton académie"
- Workspace désactivé (cancel sub) → page "Cet espace n'est plus actif"
- Workspace pas encore configuré (signup mais pas onboardé) → redirect vers onboarding

### 4.3 Multi-tenancy — pourquoi single-DB

| Approche | Pour | Contre | Verdict |
|---|---|---|---|
| **1 DB par tenant** | Isolation forte, GDPR facile | Overhead opérationnel × N tenants | ❌ Trop lourd à <1000 tenants |
| **Single-DB + `workspace_id` partout** | Simple, performant à <10k tenants | Risque de leak si filtre mal mis | ✅ Industry standard |
| **Schema-per-tenant** | Compromis | Complexe à migrer | ❌ Trop tôt |

**Décision** : single-DB avec `workspace_id` partout. **Postgres RLS (Row-Level Security)** activable plus tard pour double-couche d'isolation si besoin GDPR strict.

### 4.4 Sécurité multi-tenant — checklist

- [ ] **Toutes les queries** scoped par `workspace_id` (pas de SELECT * sans filtre)
- [ ] **Tous les endpoints** vérifient que la session a accès au workspace requesté
- [ ] **KV cache** préfixé par `ws:<workspace_id>:` pour éviter le leak
- [ ] **Tokens externes** (Notion, Stripe) chiffrés AES-256 en DB, jamais en clair dans les logs
- [ ] **Webhooks Stripe** : vérifier que le `account_id` du webhook matche un workspace existant
- [ ] **Magic link emails** : ne jamais inclure d'URL contenant un autre workspace (vérif côté backend)
- [ ] **Logs** : ne logger que des IDs, jamais des emails/tokens

### 4.5 Domaines & DNS

#### Subdomain auto
- Format : `<workspace-slug>.impulsion-academy.app`
- DNS : wildcard `*.impulsion-academy.app` → Vercel
- SSL : auto via Let's Encrypt (Vercel)

#### Custom domain (Phase 4)
- Format : `academie.coach-marc.fr` (le coach achète son domaine)
- Le coach configure un CNAME : `academie.coach-marc.fr → cname.vercel-dns.com`
- Côté Vercel : Vercel for Platforms (~$20/mois pour 10 domains, scaling jusqu'à $200/mois pour 100)
- Alternative moins chère : Cloudflare for SaaS (1000 hostnames gratuits)

---

## 5. Modèle de données

### 5.1 Tables actuelles (à conserver, +`workspace_id`)

```typescript
// src/lib/db/schema.ts

// EXISTANT — à étendre
users               // + workspaceId? (un user peut être dans N workspaces via workspaceMember)
enrollments         // + workspaceId NOT NULL
progress            // + workspaceId NOT NULL
purchases           // + workspaceId NOT NULL + stripeAccountId (Connect)
certificates        // + workspaceId NOT NULL
emailSent           // + workspaceId NOT NULL
```

### 5.2 Nouvelles tables

```typescript
// NOUVELLES TABLES

/**
 * Workspace = un compte client (un coach).
 * Pivot central du multi-tenancy.
 */
export const workspaces = pgTable('workspace', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Identité
  slug: text('slug').notNull().unique(),  // ex: "marc-coach" → marc-coach.impulsion-academy.app
  name: text('name').notNull(),            // ex: "Marc Coaching"

  // Owner (1:1 pour MVP, multi-membre Phase 5+)
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'restrict' }),

  // Plan SaaS
  plan: text('plan').notNull().default('free'),  // 'free' | 'creator'
  subscriptionStatus: text('subscription_status'),  // 'active' | 'past_due' | 'canceled' | null
  stripeCustomerId: text('stripe_customer_id'),    // pour facturer le coach (abo plateforme)
  stripeSubscriptionId: text('stripe_subscription_id'),
  trialEndsAt: timestamp('trial_ends_at', { mode: 'date' }),

  // Stripe Connect (pour les ventes du coach à ses apprenants)
  stripeAccountId: text('stripe_account_id'),      // acct_xxx (Connect Standard)
  stripeAccountChargesEnabled: boolean('stripe_account_charges_enabled').default(false),
  stripeAccountPayoutsEnabled: boolean('stripe_account_payouts_enabled').default(false),

  // Notion integration
  notionAccessToken: text('notion_access_token'),  // chiffré AES-256
  notionWorkspaceId: text('notion_workspace_id'),
  notionWorkspaceName: text('notion_workspace_name'),
  notionBotId: text('notion_bot_id'),

  // Mapping des DBs Notion (set during onboarding)
  notionProgramsDbId: text('notion_programs_db_id'),
  notionPagesDbId: text('notion_pages_db_id'),
  notionPostsDbId: text('notion_posts_db_id'),

  // Branding (JSONB)
  brandingConfig: jsonb('branding_config').default({}).notNull(),
  // {
  //   logoUrl: string | null,
  //   primaryColor: string,    // hex
  //   accentColor: string,     // hex
  //   fontFamily: string,      // 'inter' | 'figtree' | 'manrope' | 'system'
  //   customDomain: string | null,  // Phase 4
  //   customDomainVerified: boolean,
  //   senderEmail: string | null,   // Phase 4 (Resend domain)
  //   senderName: string | null,
  //   tagline: string | null,
  // }

  // Onboarding status
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  onboardingStep: integer('onboarding_step').default(0).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('workspace_slug_unique').on(t.slug),
  index('workspace_owner_idx').on(t.ownerId),
]);

/**
 * Workspace member = un user a accès à un workspace avec un rôle.
 * MVP : 1 owner par workspace. Phase 5+ : équipe.
 */
export const workspaceMembers = pgTable('workspace_member', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('owner'),  // 'owner' | 'admin' (Phase 5+) | 'member'
  invitedAt: timestamp('invited_at', { mode: 'date' }),
  joinedAt: timestamp('joined_at', { mode: 'date' }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('workspace_member_unique').on(t.workspaceId, t.userId),
  index('workspace_member_user_idx').on(t.userId),
]);
```

### 5.3 Migration safe

La codebase actuelle a 1 instance prod (Impulsion). Stratégie :

**Option A — Migrer en place (risqué)**
- Ajouter `workspace_id` nullable, créer 1 workspace "Impulsion" par défaut, backfiller, puis NOT NULL.

**Option B — Fork (recommandé)**
- Cloner le repo en `impulsion-academy`, créer une nouvelle DB Neon vierge.
- Impulsion actuel reste mono-tenant en parallèle (tu peux l'utiliser comme demo perso ou le migrer plus tard).

**Décision** : **Option B**. Plus safe pour solo dev.

### 5.4 Relations résumées

```
users ─── 1:N ─── workspace_members ─── N:1 ─── workspaces
                                                    │
                                                    │ 1:N
                                                    ▼
                                        enrollments / progress / purchases / certificates
                                                    │
                                                    │ N:1
                                                    ▼
                                                 users (les apprenants — autres que les owners)
```

> **Important** : un même `user` peut être :
> - Un **coach** (owner d'un workspace via `workspace_members`)
> - Un **apprenant** sur d'autres workspaces (via `enrollments`)
>
> Le contexte (coach vs apprenant) est déterminé par le hostname (app.* vs <slug>.*) et la query.

---

## 6. Stripe Connect Standard — spec détaillée

### 6.1 Pourquoi Connect Standard

| Type | Usage | KYC chez nous | Complexité |
|---|---|---|---|
| **Connect Standard** | Le user a son propre compte Stripe (existant ou nouveau) | ❌ Non | Faible (OAuth) |
| **Connect Express** | On gère le KYC + les comptes | ✅ Oui | Moyenne |
| **Connect Custom** | Total control, on gère tout | ✅ Oui (lourd) | Élevée |

→ **Standard** : le coach a déjà ou crée un Stripe normal, on s'authentifie via OAuth, on lance les paiements "on behalf of" lui. **L'argent ne transite jamais chez nous.**

### 6.2 Flow OAuth Stripe Connect

```
[Coach dans app.impulsion-academy.com/settings/payments]
       │ Click "Connecter mon Stripe"
       ▼
[GET /api/stripe/connect/start]
   - Génère un state token (CSRF protection)
   - Redirect vers https://connect.stripe.com/oauth/authorize?
         response_type=code
         &client_id={STRIPE_CONNECT_CLIENT_ID}
         &scope=read_write
         &redirect_uri={our_callback}
         &state={state_token}
       │
       ▼
[Page d'autorisation Stripe]
   - Le coach se logge avec son Stripe (ou crée un compte)
   - Autorise Impulsion Academy
       │
       ▼
[GET /api/stripe/connect/callback?code=ac_xxx&state=xxx]
   - Vérifie state token
   - POST https://connect.stripe.com/oauth/token avec code → récupère access_token + stripe_user_id
   - Save : workspace.stripeAccountId = stripe_user_id
   - Vérifie capabilities : retrieve account → check charges_enabled + payouts_enabled
   - Redirect vers /onboarding/payments-success
       │
       ▼
[Coach voit "✅ Stripe connecté"]
```

### 6.3 Création de Checkout Session "on behalf of"

Quand un apprenant achète un programme :

```typescript
// src/app/api/checkout/start/route.ts (adapté multi-tenant)

const workspace = await getWorkspaceFromContext();
if (!workspace.stripeAccountId) {
  return NextResponse.json({ error: 'workspace_payment_not_setup' }, { status: 400 });
}

const stripe = getStripe()!;
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ /* le programme */ }],
  // ... autres options
}, {
  // ⭐ CLÉ : "on behalf of" le compte Connect du coach
  stripeAccount: workspace.stripeAccountId,
});
```

→ La session est créée **dans le compte Stripe du coach**. L'argent est versé directement chez lui.

### 6.4 Webhook Stripe — multi-account routing

Stripe envoie 2 types de webhooks distincts :

| Source | Description | Endpoint |
|---|---|---|
| **Account Stripe d'Impulsion (la plateforme)** | Subscriptions des coachs (29€/mois) | `/api/webhooks/stripe/platform` |
| **Connect accounts (les coachs)** | Achats des apprenants chez chaque coach | `/api/webhooks/stripe/connect` |

#### Endpoint `/api/webhooks/stripe/platform`
- Reçoit : `customer.subscription.created/updated/deleted`, `invoice.paid/failed`
- Action : update `workspace.subscriptionStatus`, `workspace.plan`

#### Endpoint `/api/webhooks/stripe/connect`
- Reçoit : `checkout.session.completed`, `charge.refunded` — **avec un header `Stripe-Account: acct_xxx`**
- Action :
  1. Lookup workspace by `stripeAccountId`
  2. Si non trouvé → log + skip (security)
  3. Sinon → create purchase + enrollment dans le workspace
- Important : le `whsec_...` du webhook Connect est différent du whsec_ platform

### 6.5 Variables d'environnement Stripe

```bash
# Plateforme (abonnements des coachs)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_xxx
STRIPE_CREATOR_PRICE_ID=price_xxx  # 29€/mois

# Connect (ventes des coachs aux apprenants)
STRIPE_CONNECT_CLIENT_ID=ca_xxx  # OAuth client ID
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_yyy  # webhook séparé pour Connect events
```

### 6.6 Coût Stripe pour Impulsion Academy

- **Plateforme** : 1.4% + 0.25€ par transaction abo coach (= ~0.66€ sur 29€)
- **Connect Standard** : 0.25€ par paiement de l'apprenant (frais Stripe Connect supplémentaires)
- **Total** : marge nette par coach Creator ~28€/mois

---

## 7. Notion OAuth + duplication template — spec détaillée

### 7.1 Setup Notion Integration (à faire 1x)

1. https://www.notion.so/my-integrations → New integration
2. Type : **Public integration** (pas Internal)
3. Capabilities : `Read content`, `Update content`, `Insert content`
4. OAuth Domain & URIs :
   - Redirect URI : `https://app.impulsion-academy.com/api/auth/notion/callback`
5. Récupère :
   - `OAuth client ID`
   - `OAuth client secret`

### 7.2 Variables d'env Notion

```bash
NOTION_OAUTH_CLIENT_ID=xxx
NOTION_OAUTH_CLIENT_SECRET=xxx
NOTION_TEMPLATE_PAGE_ID=xxx  # ID de ton template officiel à dupliquer
NOTION_ENCRYPTION_KEY=xxx    # AES-256 pour chiffrer les access_token en DB
```

### 7.3 Flow OAuth Notion

```
[Coach dans onboarding/notion]
       │ Click "Connecter mon Notion"
       ▼
[GET /api/auth/notion/start]
   - Génère state CSRF token
   - Redirect vers https://api.notion.com/v1/oauth/authorize?
         client_id={NOTION_OAUTH_CLIENT_ID}
         &response_type=code
         &owner=user
         &redirect_uri={our_callback}
         &state={state_token}
       │
       ▼
[Page d'autorisation Notion]
   - Le coach choisit son workspace Notion + les pages auxquelles autoriser l'accès
   - Autorise Impulsion Academy
       │
       ▼
[GET /api/auth/notion/callback?code=xxx&state=xxx]
   - Vérifie state
   - POST https://api.notion.com/v1/oauth/token avec code → access_token + workspace_id + workspace_name + bot_id
   - Chiffre access_token avec AES-256 (NOTION_ENCRYPTION_KEY)
   - Save dans workspace.notionAccessToken (cipher) + notionWorkspaceId
   - Redirect vers /onboarding/template
```

### 7.4 Duplication automatique du template

**Approche A — Bouton "Duplicate template" dans Notion (simple)**
- Tu prépares un template Notion public partageable
- Le coach click un bouton qui ouvre Notion avec "Duplicate" déjà cliqué
- Une fois fait, le coach copie l'URL de la page dupliquée et la colle dans Impulsion
- ❌ Friction utilisateur

**Approche B — API : créer les DBs depuis zéro (complexe mais fluide)**
- L'API Notion permet de créer des DBs avec un schema défini
- On parcourt le template, on recrée chaque DB + propriétés dans le workspace du coach
- ✅ Fluide
- ❌ ~2 jours de dev pour bien faire

**Approche recommandée pour MVP** : **Approche C — hybride**
1. Le coach autorise OAuth (workspace entier)
2. On utilise l'API pour **créer 3 DBs vierges** dans son workspace : "Programmes", "Pages", "Posts"
3. Chaque DB est créée avec les bonnes propriétés (Title, slug, type, visibility, etc.)
4. On enregistre les `database_id` dans `workspace.notionProgramsDbId`, etc.
5. Le coach n'a plus qu'à créer ses programmes dans la DB "Programmes" (Notion)

### 7.5 Schéma des DBs créées

```javascript
// src/lib/notion-templates/programs-db.ts
export const PROGRAMS_DB_SCHEMA = {
  title: { Title: { title: {} } },
  properties: {
    'Title': { title: {} },  // déjà créé par défaut
    'slug': { rich_text: {} },
    'type': {
      select: {
        options: [
          { name: 'async', color: 'blue' },
          { name: 'sync', color: 'green' },
          { name: 'event', color: 'orange' },
        ]
      }
    },
    'visibility': {
      select: {
        options: [
          { name: 'public', color: 'green' },
          { name: 'unlisted', color: 'yellow' },
          { name: 'private', color: 'red' },
        ]
      }
    },
    'publishingStatus': {
      select: {
        options: [
          { name: 'draft', color: 'gray' },
          { name: 'published', color: 'green' },
          { name: 'archived', color: 'red' },
        ]
      }
    },
    'description': { rich_text: {} },
    'price': { number: { format: 'euro' } },
    'certificate_enabled': { checkbox: {} },
    // etc.
  }
};
```

### 7.6 Token refresh

Notion access_token n'expire pas (pas de refresh nécessaire) — sauf si l'utilisateur révoque manuellement. Dans ce cas, on détecte via 401 et on demande au coach de re-OAuth.

---

## 8. Système White-label

### 8.1 Branding config (JSONB sur workspace)

```typescript
type BrandingConfig = {
  logoUrl: string | null;          // Cloudinary URL
  primaryColor: string;             // hex (default: '#F9D656')
  accentColor: string;              // hex (default: '#0F172A')
  fontFamily: 'inter' | 'figtree' | 'manrope' | 'system';
  tagline: string | null;           // pour le footer

  customDomain: string | null;      // Phase 4
  customDomainVerified: boolean;

  senderEmail: string | null;       // Phase 4 — Resend domain
  senderName: string | null;        // ex: "Marc Coaching"
};
```

### 8.2 Injection dynamique CSS variables

Dans `src/app/(tenant)/layout.tsx` (server component) :

```typescript
const workspace = await getWorkspaceFromContext();
const branding = workspace.brandingConfig;

return (
  <html>
    <head>
      <style>{`
        :root {
          --accent: ${branding.primaryColor};
          --accent-edge: ${darken(branding.primaryColor, 10)};
          --accent-bg: ${lighten(branding.primaryColor, 40)};
          --font-display: '${branding.fontFamily}', system-ui;
        }
      `}</style>
    </head>
    <body>{children}</body>
  </html>
);
```

→ Pour la marketing site (`(marketing)`), la base reste en jaune Impulsion.
→ Pour le tenant (`(tenant)`), c'est les couleurs du coach qui s'appliquent.

### 8.3 Logo dans le header tenant

```typescript
// src/app/(tenant)/components/TenantHeader.tsx
const workspace = await getWorkspaceFromContext();

return (
  <header>
    {workspace.brandingConfig.logoUrl ? (
      <img src={workspace.brandingConfig.logoUrl} alt={workspace.name} />
    ) : (
      // Fallback : initiale + couleur
      <div style={{ background: workspace.brandingConfig.primaryColor }}>
        {workspace.name[0]}
      </div>
    )}
  </header>
);
```

### 8.4 Emails white-labelés

Les templates react-email actuels (`src/components/emails/_layout/EmailLayout.tsx`) doivent recevoir le `branding` en props :

```typescript
<EmailLayout previewText="..." branding={workspace.brandingConfig}>
  {/* ... */}
</EmailLayout>
```

→ Le composant `Brand` (`src/components/emails/_layout/Brand.tsx`) utilise la couleur + le nom + le logo du workspace.
→ La signature footer est customisable : nom du coach, pas "Arthur Maréchaux".

### 8.5 Fonts custom

Pour le MVP, 4 fonts pré-chargées suffisent (via Google Fonts) :
- **Inter** (default, neutre)
- **Figtree** (moderne, friendly)
- **Manrope** (clean tech)
- **System** (perf max)

Dans `src/app/(tenant)/layout.tsx`, charger uniquement la font configurée par le workspace.

### 8.6 "Powered by Impulsion Academy" sur plan Free

Sur le plan Free uniquement, footer du tenant affiche :
> "Powered by Impulsion Academy — Crée ton académie"

Le coach paie 29€/mois (Creator) pour retirer ce mention.

---

## 9. Plan de migration de la codebase actuelle

### 9.1 Stratégie : fork (Option B)

```bash
# 1. Cloner le repo Impulsion en repo Impulsion Academy
git clone <impulsion-repo> impulsion-academy
cd impulsion-academy

# 2. Renommer
- package.json: "name": "impulsion-academy"
- src/config/brand.ts: brand.name = "Impulsion Academy"
- DEPLOY.md, HANDOVER.md → adapter les références

# 3. Créer un nouveau projet Vercel + Neon DB
# 4. Créer un nouveau workspace Notion (pour le template officiel)
# 5. Créer un compte Stripe Connect (en mode test)
```

→ Impulsion actuel (`notion-publisher`) reste **intact** en prod (ton academy perso). Impulsion Academy est un **nouveau projet** indépendant.

### 9.2 Fichier par fichier — ce qui change

#### A. Tables DB (le pivot multi-tenant)

| Fichier | Changement |
|---|---|
| `src/lib/db/schema.ts` | Ajouter `workspace`, `workspace_member`. Ajouter `workspaceId` à `enrollment`, `progress`, `purchase`, `certificate`, `email_sent` |
| `src/lib/db/progress.ts` | Toutes les queries scoped par workspaceId |
| `src/lib/db/purchases.ts` | Idem + `stripeAccountId` dans `createPurchaseFromSession` |
| `src/lib/db/certificates.ts` | Idem |
| `src/lib/db/email-sent.ts` | Idem |

**Nouveau fichier** : `src/lib/db/workspaces.ts`
- `createWorkspace(opts)`
- `getWorkspaceBySlug(slug)`
- `getWorkspaceByDomain(domain)`
- `getWorkspaceById(id)`
- `listWorkspacesByUser(userId)` — pour le dashboard "switcher"
- `updateWorkspaceBranding(id, branding)`

#### B. Auth & context

| Fichier | Changement |
|---|---|
| `src/middleware.ts` | Détecte la surface (marketing/app/tenant) + résolve workspace pour tenant |
| `src/auth.ts` | Reste pareil mais ajout d'un callback pour set workspace_id dans la session |
| **Nouveau** `src/lib/auth/workspace-context.ts` | Helpers `getWorkspaceContext()`, `requireWorkspaceMember()` |

#### C. Notion (lit le token depuis le workspace)

| Fichier | Changement |
|---|---|
| `src/lib/notion.ts` | Le client Notion est instancié **par workspace** : `getNotionClient(workspace)` |
| `src/lib/programs.ts` | `listAllProgramsFromNotion(workspace)`, `buildProgramTreeFromNotion(workspace, slug)` |
| `src/lib/programs-kv.ts` | Clés préfixées `ws:<workspaceId>:programs:*` |
| `src/lib/content-store.ts` | Idem |
| `src/lib/cloudinary.ts` | Préfixes Cloudinary par workspace pour éviter les collisions |
| **Nouveau** `src/lib/auth/notion-oauth.ts` | OAuth Notion : start, callback, encrypt/decrypt token |

#### D. Sync Notion

| Fichier | Changement |
|---|---|
| `src/app/api/sync/route.ts` | Boucle sur tous les workspaces actifs et sync chacun avec son token |
| `src/app/api/sync/programs/route.ts` | Idem |
| `src/app/api/sync/programs/[slug]/route.ts` | Scope par workspace |

#### E. Stripe

| Fichier | Changement |
|---|---|
| `src/lib/stripe.ts` | Garde le client global (pour la plateforme) + ajoute `getStripeForAccount(accountId)` pour Connect |
| `src/app/api/checkout/start/route.ts` | Utilise `stripeAccount` du workspace pour Connect |
| `src/app/api/webhooks/stripe/route.ts` | Renommer en `/platform` |
| **Nouveau** `src/app/api/webhooks/stripe/connect/route.ts` | Webhook pour les events Connect (achats apprenants) |
| **Nouveau** `src/app/api/stripe/connect/start/route.ts` | OAuth Connect |
| **Nouveau** `src/app/api/stripe/connect/callback/route.ts` | OAuth callback |
| **Nouveau** `src/app/api/stripe/subscription/start/route.ts` | Crée la subscription Creator 29€/mois pour le coach |

#### F. Routes app

| Existant | Devient |
|---|---|
| `src/app/page.tsx` (landing actuel) | `src/app/(tenant)/page.tsx` (landing tenant) |
| `src/app/(site)/programs/...` | `src/app/(tenant)/programs/...` |
| `src/app/admin/*` | `src/app/(app)/dashboard/*` (pour le coach, pas plus admin "global") |
| `src/app/login` | `src/app/(app)/login` (login dashboard) + `src/app/(tenant)/login` (login apprenant) |
| `src/app/(site)/account` | `src/app/(tenant)/account` |
| `src/app/cert/verify/[code]` | Reste public mais scopé par workspace |

**Nouvelles routes app** :
```
src/app/(marketing)/
├── page.tsx              # Landing impulsion-academy.com
├── pricing/page.tsx
├── blog/...

src/app/(app)/
├── login/                # Login coach
├── signup/page.tsx       # Création workspace
├── onboarding/
│   ├── notion/page.tsx       # Step 1: Notion OAuth
│   ├── template/page.tsx     # Step 2: Création DBs Notion
│   ├── branding/page.tsx     # Step 3: Logo + couleurs
│   └── payments/page.tsx     # Step 4: Stripe Connect
├── dashboard/
│   ├── page.tsx              # Overview workspace
│   ├── programs/             # Liste, sync (scopé)
│   ├── analytics/            # Repris de admin/analytics
│   ├── settings/
│   │   ├── workspace/page.tsx
│   │   ├── branding/page.tsx
│   │   ├── notion/page.tsx   # Re-OAuth, mapping DBs
│   │   ├── payments/page.tsx # Stripe Connect status
│   │   ├── billing/page.tsx  # Mes factures plateforme
│   │   └── domain/page.tsx   # Custom domain (Phase 4)
│   └── promos/page.tsx       # Codes promo Stripe (scopés)
```

#### G. Branding

| Fichier | Changement |
|---|---|
| `src/config/brand.ts` | Renommer en `src/lib/branding/default-brand.ts` (fallback) — utilisé sur (marketing) |
| **Nouveau** `src/lib/branding/get-branding.ts` | Returns `BrandingConfig` du workspace courant ou default |
| **Nouveau** `src/components/branding/BrandingProvider.tsx` | Inject CSS variables dans `<head>` du tenant layout |
| `src/components/emails/_layout/EmailLayout.tsx` | Accepte `branding` en props |

### 9.3 Migration de l'auth

NextAuth v5 reste, mais :
- L'utilisateur peut être membre de N workspaces
- À la session, on store l'`activeWorkspaceId` dans un cookie séparé (pour switcher)
- Pages tenant : on **n'utilise pas** la session NextAuth pour l'identification de workspace (c'est le hostname). La session sert juste à savoir qui est connecté pour l'enrollment.

### 9.4 Nouvel arbre de fichiers cible

```
impulsion-academy/
├── docs/saas/
│   ├── IMPULSION_ACADEMY_PRD.md     # ← ce document
│   ├── ARCHITECTURE.md              # ← extrait de ce doc, à créer
│   └── ONBOARDING_FLOW.md           # ← UX détaillée
├── src/
│   ├── app/
│   │   ├── (marketing)/             # impulsion-academy.com
│   │   ├── (app)/                   # app.impulsion-academy.com
│   │   ├── (tenant)/                # <slug>.impulsion-academy.app
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/
│   │       │   └── notion/          # OAuth Notion
│   │       ├── stripe/
│   │       │   ├── connect/         # OAuth Connect
│   │       │   └── subscription/    # Plan SaaS
│   │       ├── webhooks/
│   │       │   └── stripe/
│   │       │       ├── platform/    # Subscriptions plateforme
│   │       │       └── connect/     # Achats apprenants
│   │       └── ... (existing endpoints scoped par workspace)
│   ├── components/
│   │   ├── branding/                # ← nouveau
│   │   ├── onboarding/              # ← nouveau
│   │   └── ... (existing)
│   ├── lib/
│   │   ├── auth/
│   │   │   ├── workspace-context.ts
│   │   │   ├── notion-oauth.ts
│   │   │   └── stripe-connect-oauth.ts
│   │   ├── db/
│   │   │   ├── schema.ts            # + workspace, workspace_member
│   │   │   ├── workspaces.ts        # ← nouveau
│   │   │   └── ... (scopés)
│   │   ├── branding/                # ← nouveau
│   │   ├── notion-templates/        # ← nouveau (création DBs)
│   │   └── ... (existing)
│   └── middleware.ts                # ← v2 : route surfaces + workspace resolution
└── ... (config existant)
```

---

## 10. Roadmap solo dev

### Vue d'ensemble — 5 phases sur 4 mois

```
┌─────────────┬─────────────┬─────────────┬─────────────┬──────────────┐
│   Phase 0   │   Phase 1   │   Phase 2   │   Phase 3   │   Phase 4    │
│   Setup     │ Multi-tenant│  Onboarding │   Stripe    │   Polish     │
│   1 sem.    │   4 sem.    │   3 sem.    │   3 sem.    │   2 sem.     │
└─────────────┴─────────────┴─────────────┴─────────────┴──────────────┘
                                                         + Phase 5 : Beta avec 5 coachs (4 sem.)
```

### Phase 0 — Setup (1 semaine)

**Livrable** : Repo cloné, projet Vercel/Neon créé, nom & branding validés.

- [ ] Clone repo `notion-publisher` → `impulsion-academy`
- [ ] Achat domaine `impulsion-academy.com` (et `impulsion-academy.app` pour subdomains)
- [ ] Création projet Vercel + DB Neon vide
- [ ] Création **Notion Integration publique** (pas internal) avec OAuth
- [ ] Création **Stripe Connect platform account** (mode test)
- [ ] Création **Resend account dédié** (pour emails Impulsion Academy distinct d'Impulsion perso)
- [ ] Création template Notion officiel (1 page parent + 3 sub-pages "Programmes", "Pages", "Posts")
- [ ] Update `package.json`, `brand.ts`, etc. avec le nouveau nom

### Phase 1 — Multi-tenancy DB (4 semaines)

**Livrable** : 2-3 workspaces cohabitent dans la même DB sans pollution croisée.

#### Semaine 1 : Schema & migrations
- [ ] Schéma Drizzle : `workspace` + `workspace_member`
- [ ] Migration : ajouter `workspace_id` à toutes les tables data (`enrollment`, `progress`, `purchase`, `certificate`, `email_sent`)
- [ ] Helpers `lib/db/workspaces.ts`

#### Semaine 2 : Middleware & context
- [ ] `src/middleware.ts` v2 : détecte la surface (marketing/app/tenant) depuis hostname
- [ ] Pour tenant : résoud workspace depuis hostname (cache KV + fallback DB)
- [ ] `src/lib/auth/workspace-context.ts` : helpers `getWorkspaceContext()`, `requireWorkspaceMember()`
- [ ] Mock data : créer 2 workspaces de test pour valider l'isolation

#### Semaine 3 : Notion + KV scoping
- [ ] `src/lib/notion.ts` : `getNotionClient(workspace)` qui décrypte le token
- [ ] `src/lib/programs.ts` : pass `workspace` partout
- [ ] `src/lib/programs-kv.ts` : clés `ws:<id>:programs:*`
- [ ] Refactor sync : `/api/sync/programs/route.ts` itère sur tous les workspaces actifs

#### Semaine 4 : Routes refactor
- [ ] Move `src/app/page.tsx` (landing) → `src/app/(tenant)/page.tsx`
- [ ] Move `src/app/admin/*` → `src/app/(app)/dashboard/*`
- [ ] Update toutes les queries DB pour passer le `workspaceId`
- [ ] Tests E2E manuels : création workspace, sync, render tenant

### Phase 2 — Onboarding & Branding (3 semaines)

**Livrable** : Un nouveau coach crée son académie en 15 min depuis zéro.

#### Semaine 5 : OAuth Notion
- [ ] Endpoints `/api/auth/notion/start` + `/callback`
- [ ] Chiffrement AES-256 du token
- [ ] Page `/onboarding/notion` avec UX claire

#### Semaine 6 : Création DBs + mapping
- [ ] `src/lib/notion-templates/programs-db.ts` (schéma)
- [ ] `src/lib/notion-templates/create-template.ts` : crée les 3 DBs dans le workspace user
- [ ] Page `/onboarding/template` : feedback en temps réel ("Création de DB Programmes... ✓")
- [ ] Sauvegarde `notionProgramsDbId`, etc. dans workspace

#### Semaine 7 : Branding
- [ ] Page `/onboarding/branding` : upload logo (Cloudinary), color picker primary
- [ ] Page `/dashboard/settings/branding` : éditer après onboarding
- [ ] `src/components/branding/BrandingProvider.tsx` : inject CSS variables dans `<head>` tenant
- [ ] Apply branding aux templates email (`EmailLayout` accepte `branding` en props)

### Phase 3 — Stripe Connect & Plans (3 semaines)

**Livrable** : Les workspaces peuvent vendre + tu factures les coachs 29€/mois.

#### Semaine 8 : Connect OAuth
- [ ] Endpoints `/api/stripe/connect/start` + `/callback`
- [ ] Page `/onboarding/payments` + `/dashboard/settings/payments`
- [ ] Save `stripeAccountId` + check capabilities

#### Semaine 9 : Checkout Connect
- [ ] Adapter `/api/checkout/start/route.ts` : utiliser `stripeAccount` du workspace
- [ ] Webhook séparé `/api/webhooks/stripe/connect` : route les events par account
- [ ] Tester end-to-end : un apprenant achète → l'argent va sur le compte du coach

#### Semaine 10 : Plan SaaS Creator 29€
- [ ] Stripe : créer le Product + Price 29€/mois (mode test puis live)
- [ ] Endpoint `/api/stripe/subscription/start` : redirect vers Checkout abo
- [ ] Webhook platform : update `workspace.subscriptionStatus`, `workspace.plan`
- [ ] Page `/dashboard/settings/billing` : invoices, plan
- [ ] Gating : si plan = free → afficher "Powered by Impulsion Academy" + limit programmes à 1

### Phase 4 — Custom Domain & Polish (2 semaines)

**Livrable** : Produit pro, prêt à ouvrir aux beta-testeurs.

#### Semaine 11 : Custom domain
- [ ] Setup Vercel for Platforms (ou Cloudflare for SaaS si budget)
- [ ] Page `/dashboard/settings/domain` : ajouter domain + check CNAME → SSL auto
- [ ] Middleware : résolution depuis `custom_domain` field

#### Semaine 12 : Polish + landing
- [ ] Marketing site `(marketing)` : landing pricing, blog placeholder
- [ ] Onboarding wizard amélioration : tooltips, vidéos courtes
- [ ] Email templates : test multi-tenant complet (chaque coach reçoit son branding)
- [ ] Doc utilisateur (`docs/user-guide.md`)

### Phase 5 — Beta avec 5 coachs (4 semaines)

**Livrable** : 5 coachs ont leur académie en ligne fonctionnelle, retour terrain accumulé.

#### Activités
- [ ] Recrutement 5 coachs LinkedIn (interviews 30 min chacun préalablement)
- [ ] Onboarding 1-1 avec chaque coach (visio 1h)
- [ ] Suivi régulier : Slack dédié, calls hebdo
- [ ] Bug fixes selon retours
- [ ] Documentation produit (FAQ, tutoriels vidéo)

---

## 11. Backlog priorisé par phase

### Phase 0 — Setup (P0)
- T0.1 Clone repo, renommer
- T0.2 Achat domaines + setup DNS Vercel
- T0.3 Créer Notion Integration publique (OAuth)
- T0.4 Créer Stripe Connect platform account
- T0.5 Créer compte Resend dédié

### Phase 1 — Multi-tenancy (P0)
- T1.1 Migration DB : table `workspace` + `workspace_member`
- T1.2 Migration DB : ajouter `workspaceId` aux tables data
- T1.3 Helpers `lib/db/workspaces.ts`
- T1.4 Middleware `src/middleware.ts` v2 (surface + workspace resolution)
- T1.5 Helper `getWorkspaceContext()`
- T1.6 Refactor `src/lib/notion.ts` (token par workspace)
- T1.7 Refactor `src/lib/programs.ts`
- T1.8 KV cache préfixes `ws:<id>:`
- T1.9 Refactor sync (`/api/sync/programs/*`)
- T1.10 Move routes : `(tenant)`, `(app)`, `(marketing)` groups
- T1.11 Update toutes les queries DB pour passer `workspaceId`

### Phase 2 — Onboarding (P0)
- T2.1 Endpoints OAuth Notion
- T2.2 Chiffrement AES-256 token Notion
- T2.3 Création DBs via API Notion (programs/pages/posts)
- T2.4 Wizard 4 étapes (`/onboarding/*`)
- T2.5 Page `/dashboard/settings/branding` (logo upload, color picker)
- T2.6 `BrandingProvider` (CSS variables dynamiques)
- T2.7 Email templates avec branding du workspace

### Phase 3 — Stripe (P0)
- T3.1 Endpoints OAuth Stripe Connect
- T3.2 Webhook séparé `/connect`
- T3.3 Adapter `/api/checkout/start` pour Connect
- T3.4 Plan Creator 29€/mois (Stripe Subscriptions)
- T3.5 Page billing
- T3.6 Gating plan free vs creator (limit programmes, "Powered by")

### Phase 4 — Custom domain & polish (P1)
- T4.1 Setup Vercel for Platforms (ou Cloudflare)
- T4.2 Page `/dashboard/settings/domain`
- T4.3 Marketing site landing + pricing
- T4.4 Doc utilisateur

### Phase 5 — Beta (P1)
- T5.1 Recrutement 5 coachs LinkedIn
- T5.2 Interviews 30 min × 5
- T5.3 Onboarding 1-1
- T5.4 Suivi hebdo Slack
- T5.5 Bug fixes

### Post-MVP (P2)
- Quizzes interactifs
- Communauté embed Circle/Discord
- Plans Pro / Business
- Multi-membres équipe
- API publique
- Mobile responsive parfait
- i18n

---

## 12. Risques & mitigations

### R1 — Notion API rate limits à grande échelle
**Impact** : à 1000 workspaces qui sync chacun toutes les heures, on explose les rate limits Notion (3 req/sec/integration).

**Mitigation** :
- Sync **on-demand** plutôt que cron systématique pour les petits workspaces
- Webhook Notion (quand le user modifie une page) → sync ciblé
- Queue Upstash QStash avec backoff exponentiel
- Dashboard de monitoring pour détecter les workspaces "spammers"

### R2 — Custom domain SSL à grande échelle
**Impact** : Vercel for Platforms coûte vite cher (~$20/mois pour 10 domains).

**Mitigation** :
- MVP : limiter custom domain au plan Pro (149€/mois) → marge confortable pour absorber le coût
- Alternative : Cloudflare for SaaS (1000 hostnames gratuits, plus complexe à setup)

### R3 — Migration multi-tenant trop complexe
**Impact** : ~150 fichiers à toucher, risque de régressions.

**Mitigation** :
- **Fork** plutôt que refactor en place. Impulsion actuel reste intact.
- TypeScript strict + pas de `any` → le compilateur attrape la majorité des leaks
- Tests E2E manuels après chaque phase

### R4 — Stripe Connect KYC lourd pour les coachs
**Impact** : Connect Standard requiert que le coach ait ou crée un compte Stripe (KYC, IBAN, etc.). Friction au signup.

**Mitigation** :
- KYC **différé** : le coach peut configurer son académie avant de connecter Stripe
- Stripe Connect ne devient nécessaire qu'au moment du **premier achat payant**
- Programmes gratuits possibles dès le départ (sans Connect)

### R5 — Notion comme dépendance critique
**Impact** : si Notion change son API ou ferme un compte coach, son académie s'effondre.

**Mitigation** :
- Backup périodique des bundles KV vers S3 (Cloudflare R2)
- Le coach peut exporter ses programmes en JSON
- Roadmap V2 : permettre l'édition directe dans Impulsion Academy (pas que via Notion)

### R6 — Complexité onboarding Notion (3-5 étapes)
**Impact** : Friction à l'inscription (créer compte Notion, OAuth, autoriser DB).

**Mitigation** :
- Vidéo de 90 sec dans le wizard
- Live chat / support pendant l'onboarding (Crisp ou Intercom)
- Onboarding 1-1 pour les beta-testeurs (apprend à pitcher)

### R7 — Solo dev sur 4 mois
**Impact** : Burnout, démotivation, scope creep.

**Mitigation** :
- 1 phase = 1 livrable testable visible (motivation)
- Build in public LinkedIn (engagement externe)
- Limites strictes : pas de feature non-prévue dans le PRD pendant 4 mois
- Rest day hebdo non-négociable

### R8 — Pas de PMF, le produit ne se vend pas
**Impact** : 4 mois de dev pour un produit qui n'intéresse personne.

**Mitigation** : **interviewer 5 coachs AVANT de coder Phase 1**. Si 0/5 sont chauds → pivot du persona ou du produit. **C'est le risque #1 à mitiger.**

### R9 — Concurrence (Teachable, Notion + Super)
**Impact** : Acteurs établis avec budget marketing.

**Mitigation** :
- Niche stricte : "coach solo qui veut Notion comme CMS"
- Différenciateur : **OAuth Notion + duplication template auto** (Teachable ne propose pas)
- Prix agressif : 29€/mois vs Teachable 39$/mois (et fonctionnalités équivalentes pour le persona cible)

---

## 13. GTM & plan beta

### Phase Pré-MVP (en parallèle des Phases 0-4)

#### Build in public LinkedIn
- 1 post par semaine pendant 16 semaines
- Sujet : problème → solution → progress → demo

#### Interviews 5 coachs (à faire AVANT Phase 1)
**Critère de sélection** :
- Coach indépendant solo
- Vend déjà 1-3 programmes
- Utilise Notion au quotidien
- 2k-10k followers LinkedIn (taille engageable)

**Script interview 30 min** :
1. (5 min) Présentation, contexte "je construis Impulsion Academy"
2. (10 min) Comment tu vends actuellement tes programmes ? Outils, friction, $$
3. (10 min) Si tu pouvais transformer ton Notion en académie en 30 min, ça t'intéresserait ? Why?
4. (5 min) Tu serais beta-testeur ? Combien tu paierais ?

**Output** : 5 interviews → notes synthétisées → repensent le PRD.

### Phase Beta (Phase 5)

#### Recrutement 5 beta-testeurs
- Les 5 coachs interviewés ↑
- Onboarding 1-1 (visio 1h)
- Slack dédié pour support
- Gratuit pendant 3 mois en échange de feedback hebdo

#### Métriques beta
- Time-to-first-program (objectif < 30 min)
- Time-to-first-sale (objectif < 30 jours)
- NPS hebdo (>30 = bon, <0 = on a un problème)

### Phase Lancement (M5+)

#### Canaux d'acquisition
- **LinkedIn** (primary) : posts personnels Arthur + témoignages beta
- **Product Hunt** launch (M6)
- **Communautés coaches** (FB groups, Slack/Discord) — soft pitching
- **SEO** : "LMS Notion", "vendre programme coaching", "Notion académie en ligne"

#### Pricing public
- **Free** : 1 programme, 50 apprenants, "Powered by"
- **Creator** : 29€/mois, 5 programmes, 500 apprenants
- (Phase 6+) Pro : 149€/mois, illimité, custom domain
- (Phase 6+) Business : 399€/mois, multi-team, white-label complet

---

## 14. Glossaire & conventions

### Glossaire

| Terme | Définition |
|---|---|
| **Workspace** | Compte client = un coach. Pivot multi-tenant. |
| **Tenant** | Synonyme de workspace dans le contexte routing/UI. |
| **Owner** | Le user créateur du workspace. MVP : 1 owner par workspace. |
| **Apprenant** | User qui s'inscrit/achète des programmes sur un tenant. Peut être membre de plusieurs workspaces (en tant qu'apprenant). |
| **Programme** | Formation pédagogique. Stocké dans Notion, sync en KV. Type async/sync/event. |
| **Unit** | "Jour" (async) ou "Module" (sync). Child page Notion. |
| **Step** | Étape d'une unit. Sub-child page Notion. |
| **Stripe Connect Standard** | Mode où le coach a son propre compte Stripe (existant ou nouveau via OAuth). On crée des Checkouts "on behalf of" lui. L'argent va direct chez lui. |
| **Plan Creator** | Plan SaaS unique du MVP, 29€/mois. |
| **Surface** | Une des 3 cibles UI : (marketing), (app), (tenant). Détectée via hostname. |
| **MVP** | Minimum Viable Product = features minimum pour vendre. Ici, l'existant Impulsion + multi-tenant + onboarding + Connect. |
| **PMF** | Product-Market Fit. Validé quand tu as ~10 paying customers actifs et un NPS > 30. |

### Conventions de code

#### Naming
- Tables DB : singulier en snake_case (ex: `workspace_member`)
- Types TS : PascalCase (`Workspace`, `BrandingConfig`)
- Files : kebab-case (`workspace-context.ts`)
- Routes : kebab-case (`/dashboard/settings/branding`)

#### Patterns
- **Server components** par défaut, **client components** uniquement pour interactivité
- **Drizzle queries scoped par workspaceId** : toujours, même pour les helpers internes
- **Tokens externes** (Notion, Stripe) chiffrés via `lib/encryption/`
- **Logs** : ne logger que des IDs, jamais d'emails / tokens / prénoms
- **Dates** : ISO 8601 partout, formatage UI au render
- **Types Stripe** : import direct depuis `stripe` package (`import type Stripe from 'stripe'`)

#### Commits Git
- Conventional commits : `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Préfixe scope si applicable : `feat(workspace): add custom domain`
- Co-Authored-By: agent IA si applicable

---

## 15. Annexes

### A. Diagramme de flux complet — un achat apprenant

```
[Apprenant Bob, sur marc-coach.impulsion-academy.app/programs/coaching-pro]
       │ Click "Acheter pour 49€"
       ▼
[Frontend] → POST /api/checkout/start avec programSlug
       │
       ▼
[Backend]
   1. getWorkspaceContext() → workspace = "marc-coach"
   2. getProgramBySlug(workspace, slug) → program (49€)
   3. workspace.stripeAccountId → "acct_marc"
   4. stripe.checkout.sessions.create({ ... }, { stripeAccount: 'acct_marc' })
   5. Return checkout URL
       │
       ▼
[Apprenant redirigé vers Stripe Checkout]
   - Page Stripe avec branding custom (du compte Marc)
   - Saisit carte
   - Paie
       │
       ▼
[Stripe envoie webhook checkout.session.completed]
   - Header: Stripe-Account: acct_marc
   - Endpoint : POST /api/webhooks/stripe/connect (whsec différent du platform)
       │
       ▼
[Backend webhook]
   1. Vérifie signature avec STRIPE_CONNECT_WEBHOOK_SECRET
   2. account = "acct_marc"
   3. workspace = SELECT * FROM workspace WHERE stripe_account_id = 'acct_marc'
   4. INSERT INTO purchase (workspace_id, user_id, ...) VALUES (...)
   5. INSERT INTO enrollment (workspace_id, ...) VALUES (...)
   6. Récupère invoice URL via stripe.invoices.retrieve(invoiceId, { stripeAccount: 'acct_marc' })
   7. Send email PurchaseConfirmationEmail avec branding du workspace
       │
       ▼
[Apprenant redirigé vers /my-learning]
   - Voit le programme acheté
   - Reçoit l'email post-achat avec lien programme + facture
```

### B. Exemple OAuth Notion callback (pseudo-code)

```typescript
// src/app/api/auth/notion/callback/route.ts
export async function GET(request: Request) {
  const { code, state } = parseQuery(request.url);

  // 1. Vérifier le state CSRF
  const expectedState = await getStateFromCookie(request);
  if (state !== expectedState) {
    return NextResponse.json({ error: 'invalid_state' }, { status: 400 });
  }

  // 2. Exchange code for access_token
  const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await tokenResponse.json();
  // { access_token, workspace_id, workspace_name, bot_id, owner: { user: {...} } }

  // 3. Récupérer le workspace courant (de la session NextAuth)
  const session = await auth();
  const userId = session.user.id;
  const workspaceId = await getActiveWorkspaceId(userId);

  // 4. Chiffrer le token
  const encryptedToken = encryptAES256(data.access_token, NOTION_ENCRYPTION_KEY);

  // 5. Save dans le workspace
  await db.update(workspaces).set({
    notionAccessToken: encryptedToken,
    notionWorkspaceId: data.workspace_id,
    notionWorkspaceName: data.workspace_name,
    notionBotId: data.bot_id,
  }).where(eq(workspaces.id, workspaceId));

  // 6. Redirect vers next step onboarding
  return NextResponse.redirect(`${getBaseUrl()}/onboarding/template`);
}
```

### C. Variables d'environnement complètes

```bash
# === Plateforme ===
NEXT_PUBLIC_SITE_URL=https://impulsion-academy.com
DATABASE_URL=postgresql://...
KV_URL=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...

# === Auth ===
AUTH_SECRET=<openssl rand -hex 32>
AUTH_URL=https://app.impulsion-academy.com
AUTH_RESEND_KEY=re_xxx
AUTH_RESEND_FROM=onboarding@impulsion-academy.com

# === Notion OAuth ===
NOTION_OAUTH_CLIENT_ID=xxx
NOTION_OAUTH_CLIENT_SECRET=xxx
NOTION_TEMPLATE_PAGE_ID=xxx
NOTION_ENCRYPTION_KEY=<openssl rand -hex 32>

# === Stripe Plateforme ===
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_xxx
STRIPE_CREATOR_PRICE_ID=price_xxx

# === Stripe Connect ===
STRIPE_CONNECT_CLIENT_ID=ca_xxx
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_yyy

# === Cloudinary (logos workspaces) ===
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# === QStash ===
QSTASH_TOKEN=xxx
QSTASH_CURRENT_SIGNING_KEY=xxx
QSTASH_NEXT_SIGNING_KEY=xxx

# === Cron ===
CRON_SECRET=<openssl rand -hex 32>

# === Tenant routing ===
NEXT_PUBLIC_TENANT_ROOT_DOMAIN=impulsion-academy.app
```

### D. Lectures et références

- **Vercel for Platforms** : https://vercel.com/docs/guides/platforms
- **Stripe Connect Standard** : https://stripe.com/docs/connect/standard-accounts
- **Notion OAuth** : https://developers.notion.com/docs/authorization
- **Postgres RLS** : https://supabase.com/docs/guides/auth/row-level-security
- **Multi-tenancy patterns** : "Database per Tenant vs Single Database" — Microsoft docs
- **react-email** : https://react.email
- **Drizzle migrations** : https://orm.drizzle.team/kit-docs/overview

### E. Premiers tickets concrets (ordre d'attaque)

Quand l'agent commence à coder :

1. **T0.1** : `git clone` + setup local + Vercel/Neon
2. **T1.1** : Migration `workspace` + `workspace_member` (Drizzle)
3. **T1.4** : Middleware v2 (peut être WIP avec routes dummy au début)
4. **T1.5** : `getWorkspaceContext()` helper
5. Tests : créer 2 workspaces de test, vérifier l'isolation des données
6. **T2.1** : OAuth Notion (start + callback)
7. **T2.3** : Création DBs Notion via API
8. **T2.4** : Wizard onboarding (UI)
9. **T2.5-7** : Branding system + injection CSS variables
10. **T3.1** : OAuth Stripe Connect (start + callback)
11. **T3.3** : Adapter `/api/checkout/start` pour Connect
12. **T3.4-6** : Plan Creator 29€ + gating
13. **T4.1-4** : Custom domain + polish + landing
14. **T5** : Beta avec 5 coachs

### F. État de la codebase actuelle (référence)

Pour comprendre la base de départ, lire dans cet ordre :
1. `HANDOVER.md` (vue d'ensemble Impulsion)
2. `DEPLOY.md` (config infra)
3. `src/lib/db/schema.ts` (modèle de données actuel)
4. `src/lib/programs.ts` (Notion → tree)
5. `src/app/api/webhooks/stripe/route.ts` (flow paiement actuel mono-tenant)
6. `src/components/emails/_layout/EmailLayout.tsx` (system email à étendre)

### G. Avant de coder Phase 1 — Validation marché

**Action obligatoire** :
- [ ] Interview 5 coachs LinkedIn (30 min chacun)
- [ ] Synthèse écrite : 5 retours sur le PRD
- [ ] Si 4/5 confirment l'intérêt + sont prêts à payer 29€ → GO Phase 1
- [ ] Si < 3/5 → pivot du persona ou du produit, refonte du PRD

**C'est le go/no-go #1.** Ne pas zapper.

---

## 🎯 Prochaine action pour démarrer

**Pour le fondateur (Arthur)** :
1. Lire ce PRD en entier (60 min)
2. Valider/ajuster les sections clés (pricing, scope, nom)
3. Programmer 5 interviews LinkedIn cette semaine
4. Si validation marché OK → green-light Phase 0

**Pour l'agent / dev qui reprend** :
1. Lire ce PRD en entier
2. Lire les 6 fichiers référencés en annexe F (état codebase actuelle)
3. Confirmer la compréhension avec le fondateur
4. Démarrer par les tickets P0 de la Phase 0
5. Code review hebdo avec le fondateur

---

**Ce document est la single source of truth du projet Impulsion Academy.**
**Toute décision majeure doit être ajoutée ici (section "Décisions actées") avant d'être implémentée.**

Bon courage et bon code 🚀
