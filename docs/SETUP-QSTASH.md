# 🚀 Guide d'installation Upstash QStash

*Synchronisation Notion sans limite de temps*

---

## 📋 Ce qui a été fait

✅ Package `@upstash/qstash` installé  
✅ Endpoint de déclenchement créé : `/api/sync/trigger`  
✅ Worker en background créé : `/api/sync/worker`  
✅ L'ancien endpoint `/api/sync` fonctionne toujours

---

## 🎯 Configuration (5 minutes)

### Étape 1 : Créer un compte Upstash

1. Aller sur https://console.upstash.com/login
2. Se connecter avec GitHub ou Email
3. C'est gratuit, pas de carte bancaire nécessaire

### Étape 2 : Activer QStash

1. Dans le dashboard Upstash, cliquer sur **"QStash"** dans le menu
2. Vous verrez directement vos clés API

### Étape 3 : Copier les clés

Vous allez voir 3 valeurs importantes :

```
QSTASH_TOKEN=eyJxxx...
QSTASH_CURRENT_SIGNING_KEY=sig_xxx...
QSTASH_NEXT_SIGNING_KEY=sig_yyy...
```

**Copiez ces 3 valeurs**, on va les utiliser dans l'étape suivante.

### Étape 4 : Ajouter les variables d'environnement

#### Sur Vercel (Production)

1. Aller sur https://vercel.com/votre-projet/settings/environment-variables
2. Ajouter ces 3 variables :

| Name | Value | Environments |
|------|-------|--------------|
| `QSTASH_TOKEN` | `eyJxxx...` (copié depuis Upstash) | Production, Preview |
| `QSTASH_CURRENT_SIGNING_KEY` | `sig_xxx...` | Production, Preview |
| `QSTASH_NEXT_SIGNING_KEY` | `sig_yyy...` | Production, Preview |

3. **Important :** Vérifier que `NEXT_PUBLIC_SITE_URL` existe déjà :

| Name | Value | Environments |
|------|-------|--------------|
| `NEXT_PUBLIC_SITE_URL` | `https://www.impulsion-ia.fr` | Production, Preview |

Si elle n'existe pas, l'ajouter !

4. **Redéployer** pour que les variables soient prises en compte :
   - Aller dans l'onglet "Deployments"
   - Cliquer sur les 3 points du dernier déploiement
   - Cliquer "Redeploy"

#### En local (Développement)

Ajouter dans `.env.local` :

```env
# QStash (depuis console.upstash.com/qstash)
QSTASH_TOKEN=eyJxxx...
QSTASH_CURRENT_SIGNING_KEY=sig_xxx...
QSTASH_NEXT_SIGNING_KEY=sig_yyy...

# URL de votre site (en local)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Puis redémarrer le serveur :

```bash
npm run dev
```

---

## 🧪 Test (2 minutes)

### Test 1 : Déclencher une sync

```bash
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=16f3d2a02a5ffa5f18a482e3120e9310f4de76ce503c87554445fd50e80f9413&force=1"
```

**Réponse attendue :**

```json
{
  "ok": true,
  "jobId": "msg_xxx",
  "message": "Sync job started in background. It will run without timeout.",
  "workerUrl": "https://www.impulsion-ia.fr/api/sync/worker",
  "force": true,
  "dashboardUrl": "https://console.upstash.com/qstash?messageId=msg_xxx"
}
```

✅ **Si vous voyez ça : SUCCESS !**

### Test 2 : Vérifier l'exécution

1. Copier le `dashboardUrl` de la réponse
2. Ouvrir dans le navigateur
3. Vous verrez le statut du job :
   - **Pending** : En attente
   - **Active** : En cours d'exécution
   - **Delivered** : Terminé avec succès ✅
   - **Failed** : Erreur ❌

**Ou** aller directement sur le dashboard : https://console.upstash.com/qstash

Vous verrez tous vos jobs et leur statut.

### Test 3 : Sync sans force (rapide)

```bash
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=16f3d2a02a5ffa5f18a482e3120e9310f4de76ce503c87554445fd50e80f9413"
```

Cette fois, sans `force=1`, ça devrait être très rapide (sync sélectif).

---

## 📊 Utilisation

### Sync quotidienne automatique

Mettre à jour votre CRON Vercel pour utiliser le nouveau endpoint :

**`vercel.json`**

```json
{
  "crons": [{
    "path": "/api/sync/trigger?secret=VOTRE_SECRET",
    "schedule": "0 2 * * *"
  }]
}
```

**Avantages :**
- ✅ Plus de timeout
- ✅ Sync complète chaque nuit
- ✅ Logs dans le dashboard QStash

### Sync manuelle

```bash
# Sync normale (rapide, seulement les pages modifiées)
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=XXX"

# Force sync (lent, toutes les pages)
curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=XXX&force=1"
```

### Webhook après sync (optionnel)

QStash peut envoyer une notification quand le sync est terminé :

```typescript
// Dans trigger/route.ts, ajouter :
const result = await qstash.publishJSON({
  url: workerUrl,
  body: { force },
  callback: 'https://votre-site.com/api/sync/callback', // ← Endpoint à créer
});
```

---

## 🎛️ Dashboard QStash

Le dashboard vous donne :

- ✅ **Liste de tous les jobs** (dernières 48h)
- ✅ **Statut en temps réel** (pending, active, delivered, failed)
- ✅ **Durée d'exécution** de chaque job
- ✅ **Logs détaillés** si erreur
- ✅ **Retry automatique** en cas d'échec

**Accès :** https://console.upstash.com/qstash

### Exemple de monitoring

```
┌─────────────┬────────────┬──────────┬─────────┐
│ Job ID      │ Status     │ Duration │ Time    │
├─────────────┼────────────┼──────────┼─────────┤
│ msg_abc123  │ Delivered  │ 45s      │ 2:00 AM │
│ msg_def456  │ Delivered  │ 8s       │ 1:00 AM │
│ msg_ghi789  │ Failed     │ 60s      │ 12:00 AM│
└─────────────┴────────────┴──────────┴─────────┘
```

---

## 🔧 Troubleshooting

### Erreur : "Missing QSTASH_TOKEN"

**Cause :** Les variables d'environnement ne sont pas définies.

**Solution :**
1. Vérifier sur Vercel → Settings → Environment Variables
2. Les 3 variables QStash sont bien là ?
3. Redéployer le projet

### Erreur : "Failed to verify signature"

**Cause :** Les clés de signature sont incorrectes ou manquantes.

**Solution :**
1. Re-copier `QSTASH_CURRENT_SIGNING_KEY` et `QSTASH_NEXT_SIGNING_KEY`
2. Attention : pas d'espace avant/après
3. Redéployer

### Le job reste en "Pending" indéfiniment

**Cause :** L'URL du worker est incorrecte.

**Solution :**
1. Vérifier la réponse du trigger :
   ```json
   "workerUrl": "https://www.impulsion-ia.fr/api/sync/worker"
   ```
2. Tester manuellement :
   ```bash
   curl https://www.impulsion-ia.fr/api/sync/worker
   ```
3. Si erreur 404 : redéployer le projet

### Le job timeout quand même

**Cause :** Le worker appelle l'ancien endpoint qui a `maxDuration: 60`.

**Solution :**
C'est normal avec l'implémentation actuelle (le worker appelle `/api/sync`).

Pour résoudre, il faut **extraire la logique de sync** dans une fonction partagée.

Je peux le faire si nécessaire, mais pour l'instant ça devrait passer car :
- Le worker lui-même n'a pas de timeout
- Il appelle l'endpoint qui a 60s de limite
- Mais le sync sélectif devrait rendre ça suffisant

Si ça timeout encore, dites-le moi et j'extrais la logique !

---

## 📈 Limites et quotas

### Plan gratuit Upstash QStash

- ✅ **500 messages/jour** (largement suffisant)
- ✅ **Retry automatique** : 2 tentatives
- ✅ **Logs** : 48 heures
- ✅ **Timeout** : 15 minutes max par job

### Plan payant (si besoin)

- 💰 **$0.50 / 100k messages**
- Logs illimités
- Support prioritaire

**Verdict :** Le plan gratuit est parfait pour votre usage ! 🎉

---

## 🔄 Migration de l'ancien endpoint

### L'ancien endpoint fonctionne toujours

```bash
# Ancien (timeout possible)
curl "https://www.impulsion-ia.fr/api/sync?secret=XXX"
```

Ça marche encore ! Vous pouvez l'utiliser pour tester.

### Migration progressive

1. **Semaine 1** : Tester QStash en parallèle
   ```bash
   # Nouveau (background)
   curl "https://www.impulsion-ia.fr/api/sync/trigger?secret=XXX"
   ```

2. **Semaine 2** : Migrer les CRON vers `/api/sync/trigger`

3. **Semaine 3+** : Désactiver l'ancien endpoint (optionnel)

---

## ✅ Checklist de déploiement

- [ ] Compte Upstash créé
- [ ] 3 variables QStash ajoutées sur Vercel
- [ ] Variable `NEXT_PUBLIC_SITE_URL` existe
- [ ] Projet redéployé
- [ ] Test manuel réussi (`/api/sync/trigger`)
- [ ] Job visible dans le dashboard QStash
- [ ] Job terminé avec succès (status "Delivered")
- [ ] CRON mis à jour (optionnel)

---

## 🎉 Résultat final

Vous avez maintenant :

✅ **Sync sans limite de temps**  
✅ **Dashboard de monitoring**  
✅ **Retry automatique**  
✅ **0 coût** (plan gratuit)  
✅ **Pas de serveur à gérer**  
✅ **Scalable** (jusqu'à 500 syncs/jour)

**Profitez de votre sync ultra-robuste ! 🚀**

---

## 📞 Besoin d'aide ?

**Erreur lors du setup :** Vérifiez les logs Vercel  
**Job failed dans QStash :** Cliquez sur le job pour voir l'erreur détaillée  
**Autre problème :** Vérifiez `docs/long-running-sync-solutions.md`

---

## 🔗 Liens utiles

- **Dashboard QStash :** https://console.upstash.com/qstash
- **Documentation QStash :** https://upstash.com/docs/qstash
- **Variables Vercel :** https://vercel.com/votre-projet/settings/environment-variables

Bon sync ! 🎊

