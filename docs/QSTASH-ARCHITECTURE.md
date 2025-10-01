# 🏗️ Architecture Upstash QStash

*Comment fonctionne la synchronisation en background*

---

## 📊 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                         Votre workflow                           │
└─────────────────────────────────────────────────────────────────┘

1. Vous déclenchez une sync
        │
        ▼
2. Vercel reçoit la requête (/api/sync/trigger)
        │
        ▼
3. Le trigger crée un job QStash (retourne immédiatement)
        │
        ▼
4. QStash exécute le job en background (pas de limite de temps)
        │
        ▼
5. Le worker fait la sync complète
        │
        ▼
6. Vous consultez le résultat dans le dashboard QStash
```

---

## 🔄 Flux détaillé

### Ancien système (avec timeout)

```
┌──────────┐
│  VOUS    │
└────┬─────┘
     │ curl /api/sync?secret=XXX
     ▼
┌──────────────────┐
│  Vercel Edge     │
│  /api/sync       │◄── Timeout après 60s ❌
│                  │
│  • Fetch Notion  │
│  • Process data  │
│  • Update cache  │
│  • Return result │
└──────────────────┘
     │
     ▼ Timeout si > 60s
```

### Nouveau système (sans timeout)

```
┌──────────┐
│  VOUS    │
└────┬─────┘
     │ 1. curl /api/sync/trigger?secret=XXX
     ▼
┌──────────────────────┐
│  Vercel Edge         │
│  /api/sync/trigger   │
│                      │
│  • Vérifie le secret │
│  • Crée job QStash   │
│  • Retourne job ID   │◄── Retour immédiat ✅ (< 1s)
└──────┬───────────────┘
       │ 2. Envoie job à QStash
       ▼
┌────────────────────────┐
│  Upstash QStash        │
│                        │
│  • Stocke le job       │
│  • Queue background    │
│  • Retry si erreur     │
└──────┬─────────────────┘
       │ 3. Appelle le worker
       ▼
┌──────────────────────────┐
│  Vercel Edge             │
│  /api/sync/worker        │
│                          │
│  • Vérifie signature     │◄── Pas de timeout ! 🎉
│  • Fetch Notion          │    (jusqu'à 15 min)
│  • Process data          │
│  • Update cache          │
│  • Return result         │
└──────┬───────────────────┘
       │ 4. Job terminé
       ▼
┌────────────────────────┐
│  Dashboard QStash      │
│                        │
│  ✅ Job completed      │
│  Duration: 2m 34s      │
│  Status: Delivered     │
└────────────────────────┘
```

---

## 📁 Structure des fichiers

```
src/app/api/sync/
├── route.ts              ← Ancien endpoint (garde en backup)
├── trigger/
│   └── route.ts         ← 🆕 Déclenche le job (retourne immédiatement)
└── worker/
    └── route.ts         ← 🆕 Exécute la sync (pas de timeout)
```

### Rôle de chaque fichier

#### 1. `/api/sync/trigger/route.ts`

**Rôle :** Point d'entrée public pour déclencher une sync

**Responsabilités :**
- ✅ Authentification (vérifie le `secret`)
- ✅ Création du job QStash
- ✅ Retour immédiat à l'utilisateur

**Durée d'exécution :** < 1 seconde

**Exemple de réponse :**
```json
{
  "ok": true,
  "jobId": "msg_abc123",
  "message": "Sync job started in background",
  "dashboardUrl": "https://console.upstash.com/qstash?messageId=msg_abc123"
}
```

#### 2. `/api/sync/worker/route.ts`

**Rôle :** Worker exécuté par QStash en background

**Responsabilités :**
- ✅ Vérification de la signature QStash (sécurité)
- ✅ Exécution de la sync complète
- ✅ Pas de limite de temps
- ✅ Retry automatique si erreur

**Durée d'exécution :** Variable (peut aller jusqu'à 15 minutes)

**Sécurité :** Seul QStash peut appeler ce endpoint (signature vérifiée)

#### 3. `/api/sync/route.ts` (ancien)

**Rôle :** Endpoint de sync original (gardé en backup)

**Statut :** Toujours fonctionnel, mais avec timeout de 60s

**Usage :** 
- Tests locaux
- Backup si QStash down (rare)
- Transition progressive

---

## 🔐 Sécurité

### Trigger endpoint

```typescript
// Vérification du secret (comme avant)
if (secret !== CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Qui peut appeler :** N'importe qui avec le secret

### Worker endpoint

```typescript
// Vérification de la signature QStash (automatique)
export const POST = verifySignatureAppRouter(POST_HANDLER);
```

**Qui peut appeler :** SEULEMENT QStash

**Comment ça marche :**
1. QStash signe chaque requête avec votre clé privée
2. Le worker vérifie la signature
3. Si signature invalide → requête rejetée

**Résultat :** Personne ne peut appeler `/api/sync/worker` directement, même avec le secret !

---

## 📡 Communication

### 1. Vous → Vercel (Trigger)

```bash
curl "https://votre-site.com/api/sync/trigger?secret=XXX"
```

**Headers :**
```
GET /api/sync/trigger?secret=XXX
Host: votre-site.com
```

**Response (immédiate) :**
```json
{
  "ok": true,
  "jobId": "msg_abc123"
}
```

### 2. Vercel → QStash

```typescript
const result = await qstash.publishJSON({
  url: 'https://votre-site.com/api/sync/worker',
  body: { force: true },
  headers: {
    'x-sync-secret': 'XXX'
  }
});
```

**QStash stocke :**
```json
{
  "messageId": "msg_abc123",
  "url": "https://votre-site.com/api/sync/worker",
  "body": { "force": true },
  "status": "pending",
  "retries": 2
}
```

### 3. QStash → Vercel (Worker)

```
POST /api/sync/worker
Host: votre-site.com
Content-Type: application/json
Upstash-Signature: sha256=...
Upstash-Message-Id: msg_abc123

{
  "force": true,
  "triggeredAt": "2025-10-01T10:30:00Z"
}
```

### 4. Worker → Notion API

```typescript
// Le worker fait tous les appels Notion
await getPageMeta(pageId);
await pageBlocksDeep(pageId);
await queryDb(databaseId);
// etc.
```

### 5. Worker → Vercel KV

```typescript
// Le worker met à jour le cache
await setPageBundle(slug, bundle);
await setDbBundleCache({ databaseId, bundle });
```

---

## ⏱️ Timeline d'une sync

### Sync rapide (peu de changements)

```
0s    │ curl /api/sync/trigger
0.5s  │ ✅ Job créé (retour immédiat)
0.6s  │ QStash appelle /api/sync/worker
1s    │ Worker démarre
3s    │ Fetch pages Notion
5s    │ Sync sélectif : 2 pages modifiées
7s    │ Update cache
8s    │ ✅ Sync terminée
```

**Durée totale :** 8 secondes

### Sync complète (force=1)

```
0s    │ curl /api/sync/trigger?force=1
0.5s  │ ✅ Job créé (retour immédiat)
0.6s  │ QStash appelle /api/sync/worker
1s    │ Worker démarre
5s    │ Fetch toutes les pages Notion
20s   │ Process blocs et images
45s   │ Sync child pages
80s   │ Update cache
90s   │ ✅ Sync terminée
```

**Durée totale :** 90 secondes (pas de timeout ! 🎉)

---

## 🔄 Retry automatique

### Scénario : Erreur temporaire

```
Tentative 1 (0min)
├─ QStash appelle /api/sync/worker
├─ Worker démarre
├─ Notion API timeout
└─ ❌ Erreur

Tentative 2 (1min)
├─ QStash retry automatique
├─ Worker démarre
├─ Notion API OK
└─ ✅ Success
```

**Configuration :**
```typescript
await qstash.publishJSON({
  url: workerUrl,
  body: { force },
  retries: 2, // ← Retry jusqu'à 2 fois
});
```

---

## 📊 Monitoring

### Dashboard QStash

**URL :** https://console.upstash.com/qstash

**Informations disponibles :**
- Liste de tous les jobs (48h)
- Statut en temps réel
- Durée d'exécution
- Logs d'erreur
- Nombre de retry

**Exemple de vue :**

```
┌─────────────┬────────────┬──────────┬─────────┬─────────┐
│ Job ID      │ Status     │ Duration │ Retries │ Time    │
├─────────────┼────────────┼──────────┼─────────┼─────────┤
│ msg_abc123  │ Delivered  │ 90s      │ 0       │ 2:00 AM │
│ msg_def456  │ Delivered  │ 8s       │ 0       │ 1:00 AM │
│ msg_ghi789  │ Failed     │ 60s      │ 2       │ 12:00 AM│
└─────────────┴────────────┴──────────┴─────────┴─────────┘
```

**Statuts possibles :**
- 🟡 **Pending** : En attente d'exécution
- 🔵 **Active** : En cours d'exécution
- 🟢 **Delivered** : Succès
- 🔴 **Failed** : Échec après tous les retry

---

## 💰 Coûts

### Plan gratuit (votre cas)

```
500 messages/jour × 30 jours = 15,000 messages/mois
```

**Votre usage estimé :**
- 1 sync quotidienne (CRON) = 30 messages/mois
- 2 syncs manuelles par semaine = 8 messages/mois
- **Total : ~38 messages/mois**

**Conclusion :** Vous utilisez **0.25%** du quota gratuit ! 🎉

### Plan payant (si besoin)

```
$0.50 / 100,000 messages

15,000 messages/mois = $0.075/mois (négligeable)
```

**Verdict :** Vous n'en aurez jamais besoin !

---

## 🆚 Comparaison : Avant / Après

| Aspect | Avant | Après (QStash) |
|--------|-------|----------------|
| **Timeout** | 60 secondes ❌ | Pas de limite ✅ |
| **Retry** | Manuel ❌ | Automatique ✅ |
| **Monitoring** | Logs Vercel | Dashboard QStash ✅ |
| **Coût** | Gratuit | Gratuit ✅ |
| **Complexité** | Simple | Simple+ |
| **Maintenance** | Vercel | Vercel + QStash |
| **Scalabilité** | Limitée ❌ | Illimitée ✅ |

---

## 🚀 Prochaines évolutions possibles

### 1. Webhook de notification

Recevoir un email/Slack quand la sync est terminée :

```typescript
await qstash.publishJSON({
  url: workerUrl,
  body: { force },
  callback: 'https://votre-site.com/api/sync/notify', // ← Notification
});
```

### 2. Sync incrémentale par page

Au lieu de tout synchroniser, sync seulement les pages demandées :

```bash
curl "/api/sync/trigger?secret=XXX&page=homepage"
```

### 3. Parallélisation avancée

Sync pages et posts en parallèle :

```typescript
await qstash.batchJSON([
  { url: '/api/sync/pages' },
  { url: '/api/sync/posts' },
]);
```

---

## 🎯 Résumé

**Architecture :**
```
Vous → Trigger → QStash → Worker → Notion
                              ↓
                         Vercel KV
```

**Avantages :**
- ✅ Pas de timeout
- ✅ Retry automatique
- ✅ Monitoring
- ✅ Gratuit
- ✅ Scalable

**Vous avez maintenant une sync robuste et professionnelle ! 🎉**

