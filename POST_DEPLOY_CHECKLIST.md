# 🧪 Post-deploy checklist

Mémo à dérouler **après chaque grosse release en prod** pour vérifier que tous les flows critiques marchent. À cocher une fois chaque test passé.

> 💡 Ce fichier est volontairement court et actionnable. Pour le setup initial, voir `DEPLOY.md`.

---

## ⚠️ Avant tout test — Migrations DB

**À FAIRE EN PREMIER, à chaque release qui touche `src/lib/db/schema.ts` :**

```bash
# En local (avant de tester en dev)
npm run db:migrate

# En prod (AVANT le deploy Vercel ou juste après le push)
DATABASE_URL="postgresql://...prod..." npm run db:migrate
```

Si tu oublies, **toutes les pages qui touchent les nouvelles colonnes vont 500** (typique : `column "X" does not exist`).

Vérifier les migrations appliquées dans Drizzle Studio :
```bash
npm run db:studio
```

Migrations connues à ce jour :
- `0000_loud_the_captain` — tables auth + LMS de base
- `0001_aberrant_mulholland_black` — table `purchase`
- `0002_flaky_blue_shield` — `purchase.invoice_url` + `invoice_pdf_url` (Session 1)
- `0003_puzzling_hannibal_king` — table `certificate` (Session 2)

---

## 📨 Emails — re-tester systématiquement

À chaque déploiement qui touche **`src/components/emails/`**, **`src/lib/email/`**, **`src/app/api/auth/`**, **`src/app/api/webhooks/stripe/`**, **`src/app/api/progress/`** ou **`src/app/api/emails/`**, tester :

### En PROD (URL réelle, vraie boîte mail)

#### 🔑 Magic link
- [ ] Aller sur `/login` → entrer un email
- [ ] Vérifier le mail reçu : design `MagicLinkEmail` (logo "● IMPULSION", titre "Ton lien de connexion", CTA jaune "Me connecter")
- [ ] Click sur le bouton → arrive sur `/my-learning` connecté

#### 🎯 Inscription gratuite (`EnrollmentWelcomeEmail`)
- [ ] Login
- [ ] Aller sur un programme **gratuit** → click "Démarrer le programme"
- [ ] Vérifier le mail reçu : design `EnrollmentWelcomeEmail` — titre **"Bienvenue dans {programme} 🎯"** (avec emoji cible 🎯, PAS l'ancien "Bienvenue 👋")
- [ ] Bouton "Démarrer le programme" mène vers la bonne URL

#### 💳 Achat programme payant (`PurchaseConfirmationEmail`)
- [ ] Login (compte différent du précédent, ou supprimer l'enrollment précédent en DB)
- [ ] Acheter un programme payant en mode **Stripe test** (carte `4242 4242 4242 4242`)
- [ ] Vérifier le mail reçu : design `PurchaseConfirmationEmail` :
  - Titre "Bienvenue dans {programme} 🎯"
  - Section **récap commande** avec montant, date
  - Lien **"📄 Télécharger ma facture"** présent
  - Bouton "Démarrer le programme"
- [ ] Click "📄 Télécharger ma facture" → arrive sur la page Stripe avec le PDF
- [ ] **Aucun second email "EnrollmentWelcome"** ne doit arriver (idempotence : webhook a déjà créé l'enrollment, `progress/start` ne re-déclenche pas)

#### 📅 Session reminder (cron — Session 3 plus tard)
- [ ] *À implémenter en Session 3* — quand fait, tester le cron `0 6 * * *` (7h Paris été) avec curl manuel
- [ ] Templates `SessionReminderEmail` variants J-1 et J0

#### ⏰ Inactivité (cron — Session 3)
- [ ] *À implémenter en Session 3* — tester le cron `0 9 * * *` (10h Paris été) avec curl
- [ ] Templates `InactivityRelaunchEmail` variants 1 et 2
- [ ] Vérifier idempotence : relancer 2× → pas de doublon

#### 📜 Certificat ready (server action — Session 3)
- [ ] *À implémenter en Session 3* — compléter 100% d'un programme → email automatique
- [ ] Template `CertificateReadyEmail` avec bouton télécharger

---

## 💰 Paiements Stripe

### À chaque deploy qui touche `/api/checkout/start` ou `/api/webhooks/stripe`

- [ ] **Test mode** — achat avec carte `4242…` :
  - [ ] Le webhook répond 200 (logs Vercel → cherche `POST 200 /api/webhooks/stripe`)
  - [ ] Ligne créée dans table `purchase` (Drizzle Studio)
  - [ ] `purchase.invoice_url` rempli (URL Stripe hosted)
  - [ ] `purchase.invoice_pdf_url` rempli
  - [ ] Ligne créée dans table `enrollment`
  - [ ] L'apprenant voit le programme dans `/my-learning`
- [ ] **Test refund** dans Stripe Dashboard → webhook `charge.refunded` → `purchase.refunded_at` rempli → l'apprenant n'a plus accès

---

## 🔄 Sync Notion

À chaque deploy qui touche `/api/sync*` ou `/lib/programs.ts` :

- [ ] Bouton **"Synchroniser Notion"** dans `/admin/programs` → succès
- [ ] Feedback affiche `X/X programmes · Y pages · Z posts · Ts`
- [ ] Vérifier qu'une modif faite dans Notion remonte bien en prod après le sync

---

## 🛡️ Auth & sessions

- [ ] Magic link login → reste connecté après reload (cookie `__Secure-authjs.session-token` présent)
- [ ] Logout → cookie supprimé → `/my-learning` redirige sur `/login`
- [ ] Compte admin → accès `/admin/*` (non-admin → redirect `/my-learning?e=forbidden`)

---

## 🎨 Visuel

- [ ] Page **`/`** (landing) — hero, programmes phares, témoignages, footer
- [ ] Page **`/programs`** — grille avec covers (charge rapide grâce à Cloudinary `f_auto,q_auto,w_800`)
- [ ] Page **`/programs/[slug]`** — hero avec cover, sidebar avec liste des modules/jours
- [ ] Page **`/programs/[slug]/[unitSlug]`** — sidebar liste les modules/jours, contenu rendu correctement
- [ ] Pages statiques : `/about`, `/mentions-legales`, `/cgv`, `/privacy` — chacune avec footer accessible

---

## 📊 Crons (vérification mensuelle)

Vercel Dashboard → ton projet → **Settings → Cron Jobs** :

- [ ] `/api/sync` (3h UTC) — dernière exécution récente, status 200
- [ ] `/api/sync/programs` (6h UTC) — idem
- [ ] `/api/emails/daily-unlocks` (8h UTC) — idem
- [ ] *(Session 3)* `/api/emails/session-reminders` (6h UTC)
- [ ] *(Session 3)* `/api/emails/inactivity-relaunch` (9h UTC)

Si un cron est red → cliquer dessus → voir les logs.

---

## 🚨 Notes / TODO en attente

### Email — à tester systématiquement après chaque release majeure
> *Origine : test session 1 — quand on a migré les templates, des anciens emails restaient en cache local. Faire le test en prod avec une vraie inscription pour valider que le bon template part.*

### Quand tout sera implémenté (Sessions 2-4)
- [ ] Re-dérouler la totalité de cette checklist
- [ ] Spécifiquement re-tester **les 7 emails** un par un en prod (pas juste preview localhost:3001)
- [ ] Mettre `SEO_NOINDEX=0` pour ouvrir aux moteurs de recherche
