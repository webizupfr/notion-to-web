# Stack consolidation — follow-up

> Décision prise le 2026-04-23 : on garde la stack éclatée le temps de shipper Sprint 2.
> Consolidation à faire après validation du flow auth + progress.

## État actuel (fragmenté — 5 providers)

| Service | Rôle | Dashboard |
|---|---|---|
| Vercel | Hosting + cron | vercel.com |
| Notion | Content source | notion.so (non négociable) |
| Cloudinary | Image mirroring + transforms | cloudinary.com |
| Vercel KV (= Upstash Redis) | Cache bundles | vercel.com → Storage |
| Upstash QStash | Queue async sync | console.upstash.com |
| Neon | Postgres users/progress (Sprint 2) | console.neon.tech |
| Resend | Emails magic link (Sprint 2) | resend.com |

## Cible — Vercel Marketplace (1 dashboard)

Tous les providers ci-dessous **existent déjà sur Vercel Marketplace** et auto-injectent leurs credentials dans le projet.

| Service actuel | Migration |
|---|---|
| Neon standalone | → **Neon via Vercel Marketplace** |
| Resend standalone | → **Resend via Vercel Marketplace** |
| Upstash QStash standalone | → **Upstash via Vercel Marketplace** (si pas déjà) |
| Cloudinary | → reste externe (pas sur Marketplace AFAIK) |

## Bénéfices

- **1 seul dashboard** ops (Vercel) au lieu de 4-5
- **`vercel env pull`** récupère tout d'un coup
- **Client licencié** : crée 1 compte Vercel + 1 compte Notion, le reste se connecte en 1 clic
- **Billing** unifié via Vercel (même si chaque provider reste gratuit sur free tier)

## Code impact

**Zéro.** Les env vars gardent les mêmes noms (ou peuvent être renommées dans Vercel UI). Le code ne change pas.

## Plan de migration (à faire post-Sprint 2)

1. Valider que Sprint 2 marche (login + enroll + complete) avec Neon direct + Resend direct
2. Dans Vercel dashboard → Marketplace → Add Neon → "Connect existing" (pas de migration data si on crée neuf)
   - Ou: `pg_dump` → `pg_restore` vers la nouvelle DB Neon créée via Marketplace si besoin
3. Dans Vercel → Marketplace → Add Resend → "Connect existing"
4. Supprimer les env vars obsolètes du `.env.local`
5. `vercel env pull .env.local` pour récupérer les nouvelles
6. Déployer, tester

Temps estimé : ~30min si tout se passe bien.

## Note sur les coûts

Tout reste **100% gratuit** sur les free tiers jusqu'à :
- ~3000 users actifs/mois (limite Resend 100 emails/jour)
- ~50k visites/mois (limite Vercel Hobby bandwidth)
- 100-200 hubs × 100 images (limite Cloudinary 25 crédits/mois)

**Vercel Hobby plan interdit l'usage commercial** — pour vendre l'accès au LMS, passer en **Vercel Pro à 20 $/mois/user**. Négligeable par rapport aux revenus LMS.
