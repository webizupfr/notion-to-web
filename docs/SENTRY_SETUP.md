# Sentry — Setup (optionnel, ~10 min)

> Non installé par défaut. Active quand tu veux capturer les erreurs prod sans regarder les logs Vercel.

## Quand activer

- **Pas avant les premiers clients** : tu es seul à tester, pas de trafic → logs Vercel suffisent.
- **Dès le 1er client** : active → tu sais ce qui casse en live sans demander aux users.
- **Avec plusieurs deployments clients** : indispensable. 1 projet Sentry par client.

## Install (~3 min)

```bash
cd notion-publisher
npx @sentry/wizard@latest -i nextjs
```

Le wizard :
1. Crée un compte Sentry gratuit (5k errors/mois suffisants MVP)
2. Génère `sentry.client.config.ts` + `sentry.server.config.ts` + `sentry.edge.config.ts`
3. Injecte `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` dans `.env.local`
4. Configure `next.config.ts` avec `withSentryConfig`

## Post-install — ajouter à `.env.example`

```bash
# Sentry (error monitoring en prod)
# Généré automatiquement par `npx @sentry/wizard@latest -i nextjs`
SENTRY_DSN=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=   # pour uploads sourcemaps au build
```

## Configuration recommandée

Dans `sentry.client.config.ts` :

```ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // 10% des sessions traced (gratuit suffisant)
  tracesSampleRate: 0.1,
  // 0% des replays (gourmand, active seulement si tu investigues un bug)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

## Usage code

Le wizard pose déjà les hooks. Pour capturer manuellement une erreur :

```ts
import * as Sentry from '@sentry/nextjs';

try {
  await dangerousOp();
} catch (e) {
  Sentry.captureException(e, {
    tags: { route: 'sync' },
    extra: { force: true },
  });
}
```

Pour identifier l'user :

```ts
// dans le layout auth
Sentry.setUser({ id: session.user.id, email: session.user.email });
```

## Dashboards client

Une fois installé, tu crées 1 projet Sentry par client, tu partages le lien du dashboard Sentry en lecture seule avec le client → il voit ce qui casse chez lui sans avoir accès au code.

## Intégration avec `/app/error.tsx`

Le `GlobalError` actuel log juste en console. Après install Sentry, il capture automatiquement via le hook Next.js (rien à changer). Le `error.digest` visible à l'user matche l'event Sentry côté dashboard.

---

**TL;DR** : pas bloquant pour ship. Active quand tu as des users réels.
