# Setup — Notion Publisher

Guide de déploiement pour un nouveau client. Cible : **< 2h du fork à la home qui s'affiche**.

---

## 1. Prérequis

- Compte **Vercel** (free tier ok pour démarrer)
- Compte **Notion** avec accès à 8 databases
- Compte **Upstash** (gratuit) pour QStash + KV si pas sur Vercel
- Compte **Cloudinary** (gratuit) — optionnel mais recommandé
- Node **20.x** ou plus récent

---

## 2. Fork & clone

```bash
git clone <ce-repo> mon-client
cd mon-client
npm install
```

---

## 3. Branding — 2 fichiers à éditer

### 3.1 `src/config/brand.ts`
Identité du client : nom, tagline, description, URLs externes, email, réseaux sociaux. Voir les commentaires dans le fichier — tout est documenté.

```ts
export const brand = {
  name: "AcmeSchool",
  fullName: "AcmeSchool · Plateforme d'apprentissage",
  tagline: "Apprendre. Créer. Délivrer.",
  description: "...",
  contactUrl: "https://acme.fillout.com/inscription",
  supportEmail: "hello@acmeschool.fr",
  marketingUrl: "https://acmeschool.fr",    // ou `null` si pas d'externe
  social: { linkedin: "...", twitter: null, ... },
  // ...
};
```

### 3.2 `src/config/navigation.ts`
Structure du site : univers (sections), liens header, cartes home, liens footer.

- Chaque **univers** = un préfixe d'URL (`/studio`, `/lab`, etc.) + ses liens de nav.
- L'**univers actif** est déterminé par l'URL courante — le client n'a pas à gérer de state.
- Les **homeCards** sont les 3 tuiles affichées sur la home `(site)/`.
- Les **footerLinks** = liens footer (contact + légal).

---

## 4. Tokens visuels — 1 fichier

`src/lib/theme/tokens.css` — palette, radius, shadows, typo.

La palette utilise **OKLCH**. Pour ajuster la couleur brand :
- `--accent` (valeur principale)
- `--accent-bg` / `--accent-ink` / `--accent-edge`

Tester en dev via `npm run dev` avec les devtools ouverts pour valider le rendu.

**Fonts** : actuellement Bricolage Grotesque + JetBrains Mono via next/font. Pour changer, éditer `src/app/layout.tsx`.

---

## 5. Assets statiques

Remplacer dans `public/` :
- `favicon.ico` (obligatoire)
- `og-default.png` (1200×630, metadata) — **à créer en Sprint 4**
- Autres images marketing

---

## 6. Variables d'environnement

```bash
cp .env.example .env.local
```

Voir `.env.example` — **chaque variable est documentée**.

### 6.1 Notion
1. Créer une **intégration Notion** : https://www.notion.so/my-integrations
2. Copier le token secret → `NOTION_TOKEN`
3. Créer les 8 databases dans Notion (voir `/docs/IMPLEMENTATION-HUBS-LEARNING-PATH-DBS.md` pour schéma)
4. Partager chaque DB avec l'intégration (⋯ → Add connections)
5. Copier les 8 IDs dans les vars `NOTION_*_DB`

### 6.2 Vercel KV
1. Vercel dashboard → Storage → Create → KV
2. Connect to project — variables `KV_*` auto-injectées
3. En local : `vercel env pull .env.local` pour récupérer

### 6.3 QStash (pour sync async)
1. https://console.upstash.com/qstash → Create project
2. Copier `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`

### 6.4 Cloudinary (recommandé)
1. https://cloudinary.com → sign up
2. Dashboard → copier `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### 6.5 Cron secret
```bash
openssl rand -hex 32   # → CRON_SECRET
```

### 6.6 SEO
Par défaut `SEO_NOINDEX=1` (noindex partout, comportement historique).
Mettre à `0` en prod **seulement** après Sprint 4 (metadata par page + OG images).

---

## 7. Premier lancement

```bash
npm run dev
```

→ http://localhost:3000

**Checks attendus** :
- La home `/` affiche les 3 cartes de `homeCards` avec le bon branding
- `/gate` affiche le formulaire avec le bon nom client
- Pas d'erreur "Impulsion" résiduelle

---

## 8. Sync initiale du contenu Notion

```bash
# Trigger sync via QStash (prod)
npm run sync:prod:force

# Ou en local
npm run sync:force
```

Vérifier Vercel KV → bundles créés.

---

## 9. Déploiement Vercel

```bash
vercel
```

Variables d'env à définir dans Project Settings → Environment Variables (toutes celles de `.env.local`).

**Cron setup** : `vercel.json` définit déjà un cron quotidien à 03:00 UTC qui hit `/api/sync`. Vérifier dans Vercel dashboard → Crons.

---

## 10. Checklist livraison client

- [ ] Branding : `brand.ts` + `navigation.ts` revus ligne par ligne
- [ ] Tokens `tokens.css` ajustés à la palette client
- [ ] Favicon + OG image placées dans `public/`
- [ ] 8 DB Notion créées et partagées avec intégration
- [ ] 8 IDs collés dans `.env.local` + Vercel env
- [ ] Premier sync réussi (KV non vide)
- [ ] Home `/` affiche correctement
- [ ] Gate `/gate` avec bonne clé fonctionne
- [ ] Au moins 1 hub + 1 sprint accessibles
- [ ] Cron Vercel activé
- [ ] Domaine custom configuré (si client l'a)
- [ ] Client a accès éditeur à toutes les DBs Notion
- [ ] Doc Notion fournie au client : comment ajouter un jour / une activité / un widget

---

## 11. Sprint 2 (v2026-04) — Auth + DB progression

Le projet inclut maintenant un vrai LMS avec comptes individuels.

### Activation

1. **Neon Postgres** (gratuit) :
   - https://console.neon.tech → sign up → New Project
   - Copier "Connection string" → `.env.local` : `DATABASE_URL=postgresql://...`

2. **Resend** (emails magic link, gratuit jusqu'à 3k emails/mois) :
   - https://resend.com → API Keys → Create → copier dans `AUTH_RESEND_KEY`
   - Pour tester : utiliser `AUTH_RESEND_FROM=onboarding@resend.dev` (limité aux emails du compte Resend)
   - Pour prod : ajouter ton domaine + vérifier DNS, puis `AUTH_RESEND_FROM=hello@tonsite.fr`

3. **Auth secret** :
   ```bash
   openssl rand -hex 32   # → AUTH_SECRET
   ```

4. **Migrer la DB** :
   ```bash
   npm run db:push   # Crée les tables dans Neon
   ```

5. **Browser flow** :
   - Visite `/login` → entre email → reçoit lien magique
   - Clique le lien → redirect `/my-learning` → dashboard vide (aucun enrollment)
   - `POST /api/progress/start` avec `{ programType, programSlug, cohortSlug? }` pour enroll (côté admin/import)
   - `POST /api/progress/complete` avec `{ activityNotionId, ... }` pour marquer complété

### Tables créées

- `user`, `account`, `session`, `verificationToken` — NextAuth standard
- `enrollment` — inscription user à un programme (hub/sprint) ± cohorte
- `progress` — état d'une activité (unlocked / started / completed) par user

### Routes ajoutées

- `/login` + `/login/verify` — magic link flow
- `/my-learning` — dashboard apprenant (hubs + sprints unifiés, completed count, progression)
- `/admin` — admin dashboard (overview, users, programs) **[Sprint 3]**
- `/admin/users` + `/admin/users/[id]` — gestion users **[Sprint 3]**
- `/admin/programs` — stats par programme **[Sprint 3]**
- `/api/auth/[...nextauth]` — NextAuth handlers
- `/api/progress/start` — enroll user
- `/api/progress/complete` — mark activity done

## 12. Sprint 3 — Admin + observabilité

### Devenir admin (premier usage)

1. Login via magic link une première fois → crée ton user en DB avec `role='learner'`
2. Promote toi-même via CLI :
   ```bash
   npm run admin:list                          # voir tous les users
   npm run admin:promote -- ton@email.com      # te promouvoir
   ```
3. Rafraîchis la page → `/admin` est accessible

### Admin dashboard

- `/admin` : KPIs globaux (users, enrollments, complétions, taux)
- `/admin/users` : liste + compteurs par user (enrollments, complétions)
- `/admin/users/[id]` : détail user + actions (promote/demote, désinscrire, reset progress)
- `/admin/programs` : stats par hub/sprint (enrollés, terminés, taux)

Les pages `/admin/*` sont protégées middleware (redirect /login si pas de session) + guard server-side (redirect /my-learning si pas admin).

### Error boundary

- `app/error.tsx` : friendly page sur crash client non géré
- `app/not-found.tsx` : page 404 branded

### Sentry (optionnel)

Voir `docs/SENTRY_SETUP.md`. Pas installé par défaut — à activer quand tu as des users réels.

### À venir (Sprint 4+)

- SEO complet (generateMetadata, JSON-LD Course, OG images dynamiques)
- Certificats PDF à la complétion
- i18n + tests E2E + CI

Voir `doc/LMS-ROADMAP.md` pour le détail.

---

## Troubleshooting

**Erreur "Cannot find module '@/config/brand'"** → relance TS server dans ton IDE.

**Sync qui timeout** → augmenter `maxDuration` dans `src/app/api/sync/route.ts` (Vercel Pro requis > 60s).

**Pages vides en prod** → vérifier que KV est bien connectée, que le sync a tourné, que `hasKv()` retourne `true`.

**Fonts pas chargées** → vérifier Bricolage + JetBrains sur Google Fonts ok, sinon rollback avec une autre font dans `src/app/layout.tsx`.
