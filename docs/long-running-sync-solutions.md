# 🚀 Solutions pour Sync Long-Running

*Guide complet des alternatives pour gérer une synchronisation qui dépasse 60 secondes*

---

## 📊 État actuel

**Problème :**
- Sync complète > 60 secondes
- Vercel timeout même avec optimisations
- Child pages désactivées temporairement

**Objectif :**
- Sync complète sans timeout
- Child pages réactivées
- Solution scalable

---

## 🎯 Solutions par ordre de simplicité

### ⭐ Solution 1 : Upstash QStash (RECOMMANDÉ)

**Temps d'implémentation :** 30 minutes  
**Coût :** Gratuit jusqu'à 500 messages/jour  
**Complexité :** ⭐⭐☆☆☆

Reste sur Vercel, mais exécute le sync en background sans limite de temps.

#### Avantages

✅ Reste sur Vercel (pas de migration)  
✅ Gratuit pour usage normal  
✅ Pas de limite de temps  
✅ API simple  
✅ Retry automatique en cas d'erreur

#### Installation

```bash
npm install @upstash/qstash
```

**Variables d'environnement :**
```env
# .env.local
QSTASH_URL=https://qstash.upstash.io
QSTASH_TOKEN=your_token_here
QSTASH_CURRENT_SIGNING_KEY=your_key_here
QSTASH_NEXT_SIGNING_KEY=your_next_key_here
```

#### Implémentation

**Nouveau fichier : `src/app/api/sync/trigger/route.ts`**

```typescript
import { Client } from '@upstash/qstash';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const force = searchParams.get('force') === '1';

  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const qstash = new Client({
    token: process.env.QSTASH_TOKEN!,
  });

  // Envoyer le job en background
  const result = await qstash.publishJSON({
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/sync/worker`,
    body: { force },
    headers: {
      'x-sync-secret': process.env.CRON_SECRET!,
    },
  });

  return Response.json({
    ok: true,
    jobId: result.messageId,
    message: 'Sync started in background',
  });
}
```

**Nouveau fichier : `src/app/api/sync/worker/route.ts`**

```typescript
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';

// Copier tout le code de src/app/api/sync/route.ts
// Mais retirer maxDuration (pas de limite !)

export const runtime = 'nodejs';
// PAS de maxDuration = pas de limite de temps ! 🎉

async function POST(request: Request) {
  // Vérifier la signature QStash
  const body = await request.json();
  const force = body.force ?? false;

  // ... tout le code de sync ici ...
  // (même logique que l'actuel GET route)

  return Response.json({ ok: true, ... });
}

export const POST = verifySignatureAppRouter(POST);
```

#### Utilisation

```bash
# Déclencher le sync (retourne immédiatement)
curl "https://votre-site.com/api/sync/trigger?secret=XXX&force=1"

# Réponse immédiate :
{
  "ok": true,
  "jobId": "msg_123abc",
  "message": "Sync started in background"
}

# Le sync s'exécute en arrière-plan, sans limite de temps !
```

#### Dashboard QStash

Voir l'avancement : https://console.upstash.com/qstash

---

### ⭐⭐ Solution 2 : Vercel Cron + Split Sync

**Temps d'implémentation :** 1 heure  
**Coût :** Gratuit  
**Complexité :** ⭐⭐⭐☆☆

Diviser le sync en plusieurs endpoints plus petits.

#### Principe

```
/api/sync/pages     → Sync seulement les pages (< 30s)
/api/sync/posts     → Sync seulement les posts (< 20s)
/api/sync/children  → Sync seulement les child pages (< 20s)
/api/sync/all       → Orchestre les 3 en séquence
```

#### Implémentation

**`src/app/api/sync/pages/route.ts`**

```typescript
export const maxDuration = 30;

export async function GET(request: Request) {
  // Sync seulement PAGES_DB
  const pages = await collectDatabasePages(PAGES_DB);
  
  for (const page of pages) {
    await syncPage(page, { type: 'page', stats, force });
  }
  
  return Response.json({ ok: true, synced: pages.length });
}
```

**`src/app/api/sync/posts/route.ts`**

```typescript
export const maxDuration = 30;

export async function GET(request: Request) {
  // Sync seulement POSTS_DB
  const posts = await collectDatabasePages(POSTS_DB);
  
  for (const post of posts) {
    await syncPage(post, { type: 'post', stats, force });
  }
  
  return Response.json({ ok: true, synced: posts.length });
}
```

**`src/app/api/sync/children/route.ts`**

```typescript
export const maxDuration = 30;

export async function GET(request: Request) {
  // Sync seulement les child pages
  // (lire depuis KV les pages avec childPages)
  
  return Response.json({ ok: true, synced: count });
}
```

#### Vercel Cron

**`vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/sync/pages?secret=XXX",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/sync/posts?secret=XXX",
      "schedule": "5 2 * * *"
    },
    {
      "path": "/api/sync/children?secret=XXX",
      "schedule": "10 2 * * *"
    }
  ]
}
```

**Avantages :**
- ✅ Chaque endpoint < 30s
- ✅ Pas de timeout
- ✅ Reste sur Vercel
- ✅ Gratuit

**Inconvénients :**
- ⚠️ Plus complexe à maintenir
- ⚠️ Sync séquentielle (plus lente)

---

### ⭐⭐⭐ Solution 3 : Render (Backend séparé)

**Temps d'implémentation :** 2 heures  
**Coût :** Gratuit (avec limitations) ou 7$/mois  
**Complexité :** ⭐⭐⭐⭐☆

Migrer la sync vers un backend Node.js sur Render.

#### Avantages

✅ **Pas de limite de temps** (jusqu'à 15 minutes)  
✅ Gratuit avec plan Starter  
✅ Déploiement automatique depuis Git  
✅ Environnement Node.js complet

#### Inconvénients

⚠️ Plan gratuit : instance sleep après 15 min d'inactivité  
⚠️ Première requête après sleep = lente (cold start)  
⚠️ Maintenance d'un deuxième service

#### Architecture

```
Vercel (Frontend + Pages)
    │
    └─── Appelle ───> Render (Sync API)
                           │
                           └─── Sync Notion
                           └─── Update Vercel KV
```

#### Implémentation

**Nouveau repo : `notion-sync-worker`**

```bash
mkdir notion-sync-worker
cd notion-sync-worker
npm init -y
npm install express @notionhq/client @upstash/redis dotenv
```

**`index.js`**

```javascript
const express = require('express');
const app = express();

// Copier toute la logique de sync depuis route.ts
// Mais en Express au lieu de Next.js

app.get('/sync', async (req, res) => {
  const { secret, force } = req.query;
  
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ... toute la logique de sync ...
  
  res.json({ ok: true, synced: pages.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Sync worker running on port ${PORT}`);
});
```

**Déploiement sur Render**

1. Push sur GitHub
2. Aller sur https://render.com
3. New → Web Service
4. Connecter le repo
5. Configurer :
   - **Environment :** Node
   - **Build Command :** `npm install`
   - **Start Command :** `node index.js`
   - **Plan :** Free ou Starter (7$/mois)

6. Variables d'environnement :
   - `NOTION_API_KEY`
   - `NOTION_PAGES_DB`
   - `NOTION_POSTS_DB`
   - `CRON_SECRET`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`

**Utilisation depuis Vercel**

```typescript
// Dans Vercel, appeler Render
export async function GET(request: Request) {
  const response = await fetch(
    `https://votre-worker.onrender.com/sync?secret=XXX&force=1`,
    { signal: AbortSignal.timeout(900000) } // 15 min max
  );
  
  return Response.json(await response.json());
}
```

**Render Cron Jobs**

Render propose des Cron Jobs natifs (7$/mois) :

```yaml
# render.yaml
services:
  - type: web
    name: notion-sync-worker
    env: node
    buildCommand: npm install
    startCommand: node index.js

  - type: cron
    name: daily-sync
    schedule: "0 2 * * *"
    command: "curl https://votre-worker.onrender.com/sync?secret=XXX"
```

---

### ⭐⭐⭐⭐ Solution 4 : Railway

**Temps d'implémentation :** 1 heure  
**Coût :** 5$/mois minimum  
**Complexité :** ⭐⭐⭐☆☆

Alternative à Render, plus moderne.

#### Avantages

✅ Pas de sleep (toujours actif)  
✅ Meilleure performance que Render Free  
✅ Deploy automatique depuis Git  
✅ CLI puissante

#### Déploiement

```bash
# Installer Railway CLI
npm install -g @railway/cli

# Login
railway login

# Créer un projet
railway init

# Déployer
railway up
```

**Configuration :** Identique à Render (voir Solution 3)

---

### ⭐⭐⭐⭐⭐ Solution 5 : Inngest (Background Jobs)

**Temps d'implémentation :** 2 heures  
**Coût :** Gratuit jusqu'à 50k steps/mois  
**Complexité :** ⭐⭐⭐⭐⭐

La solution la plus professionnelle pour les jobs long-running.

#### Avantages

✅ Reste sur Vercel  
✅ Retry automatique  
✅ Dashboard de monitoring  
✅ Scheduling avancé  
✅ Gestion d'erreurs sophistiquée

#### Installation

```bash
npm install inngest
```

**`src/inngest/client.ts`**

```typescript
import { Inngest } from 'inngest';

export const inngest = new Inngest({ id: 'notion-sync' });
```

**`src/inngest/functions.ts`**

```typescript
import { inngest } from './client';

export const syncNotion = inngest.createFunction(
  { id: 'sync-notion' },
  { event: 'sync/trigger' },
  async ({ event, step }) => {
    const pages = await step.run('fetch-pages', async () => {
      return await collectDatabasePages(PAGES_DB);
    });

    await step.run('sync-pages', async () => {
      for (const page of pages) {
        await syncPage(page, { type: 'page', stats, force: event.data.force });
      }
    });

    return { ok: true, synced: pages.length };
  }
);
```

**Dashboard :** https://app.inngest.com

---

## 📊 Comparaison des solutions

| Solution | Coût | Complexité | Temps implémentation | Scalabilité |
|----------|------|------------|---------------------|-------------|
| **Upstash QStash** | Gratuit | ⭐⭐ | 30 min | ⭐⭐⭐⭐⭐ |
| **Split Sync** | Gratuit | ⭐⭐⭐ | 1h | ⭐⭐⭐ |
| **Render** | 0-7$/mois | ⭐⭐⭐⭐ | 2h | ⭐⭐⭐⭐ |
| **Railway** | 5$/mois | ⭐⭐⭐ | 1h | ⭐⭐⭐⭐ |
| **Inngest** | Gratuit | ⭐⭐⭐⭐⭐ | 2h | ⭐⭐⭐⭐⭐ |

---

## 🎯 Recommandation

### Pour votre cas (sync régulière, pas trop de pages)

**1️⃣ Court terme (maintenant) :**
- ✅ Child pages désactivées (déjà fait)
- ✅ Testez si ça passe maintenant

**2️⃣ Moyen terme (cette semaine) :**
- ⭐ **Upstash QStash** (RECOMMANDÉ)
- Raison : Gratuit, simple, reste sur Vercel
- Temps : 30 minutes
- Permet de réactiver les child pages

**3️⃣ Long terme (si croissance) :**
- ⭐⭐⭐⭐⭐ **Inngest**
- Raison : Solution professionnelle, monitoring, retry
- Quand : Si > 100 pages ou problèmes récurrents

---

## 🚀 Quick Start : Upstash QStash

### 1. Créer un compte Upstash

https://console.upstash.com/qstash

### 2. Installer le package

```bash
npm install @upstash/qstash
```

### 3. Ajouter les variables d'environnement

```env
QSTASH_TOKEN=qstash_token_xxx
QSTASH_CURRENT_SIGNING_KEY=key_xxx
QSTASH_NEXT_SIGNING_KEY=key_xxx
NEXT_PUBLIC_SITE_URL=https://www.impulsion-ia.fr
```

### 4. Créer les fichiers

Je peux vous créer les 2 fichiers nécessaires si vous choisissez cette solution !

---

## 💡 Décision à prendre

**Question pour vous :**

1. **Testez d'abord** avec child pages désactivées → Ça passe maintenant ?
2. Si oui, quelle solution long-terme préférez-vous :
   - 🟢 **Upstash QStash** (recommandé, gratuit, 30 min)
   - 🟡 **Render** (backend séparé, gratuit ou 7$/mois)
   - 🔵 **Inngest** (pro, gratuit, 2h setup)

**Dites-moi et je vous implémente la solution complète ! 🚀**

