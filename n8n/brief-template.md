# 📋 Template de brief — pour bien guider l'agent

Quand tu remplis le formulaire n8n, fournis les 4 infos suivantes. Plus elles sont précises, meilleur sera le résultat.

---

## Champ 1 — `audience` (public cible)

**Format** : 1-2 lignes ultra-précises, pas de bullshit corporate.

✅ Bons exemples :
- *"Freelances designers (UX/UI) qui pitchent à des clients PME, 30-40 ans, à l'aise avec Figma mais débutants en IA."*
- *"Coachs et consultants indépendants qui veulent intégrer ChatGPT pour gagner du temps sur leur prep."*
- *"Solopreneurs qui galèrent à écrire des contenus marketing réguliers sur LinkedIn."*

❌ Mauvais exemples :
- *"Entrepreneurs"* (trop large)
- *"Tout le monde"* (no-go)
- *"Personnes qui veulent apprendre l'IA"* (pas actionnable)

**Astuce** : termine ta phrase par "qui galère à X" ou "qui veut Y" — ça force la précision.

---

## Champ 2 — `format` (durée + cadence)

**Format attendu** : `[type] [durée] [cadence]`

Choix possibles :
- `challenge async X jours` — 1 unit déverrouillée par jour, async (default 30-45 min/jour)
- `sprint sync 1 jour` — workshop intense 1 journée, sync
- `événement 2h` — masterclass / talk / atelier ponctuel
- `formation async X jours` — plus long que challenge, plus dense

✅ Bons exemples :
- *"challenge async 5 jours, ~30min par jour, max 5 exercices/jour"*
- *"sprint sync 1 jour avec 4 modules de 1h chacun"*
- *"événement 2h, format atelier interactif"*

**Conseil** : un format **court et focalisé** convertit mieux qu'un long. Pour un lead magnet, vise **3 jours max**.

---

## Champ 3 — `level` (niveau apprenant)

**3 valeurs** :
- `débutant absolu` — n'a jamais ouvert ChatGPT
- `débutant à l'aise avec le numérique` — connait les outils basiques mais pas l'IA
- `intermédiaire` — utilise l'IA en mode bricolage, veut structurer
- `avancé` — déjà autonome, vient pour des techniques pointues

**Conseil** : pour un programme à vendre, **vise les débutants à l'aise** — c'est le segment le plus large et le plus prêt à payer.

---

## Champ 4 — `business_goal` (objectif business)

À quoi sert ce programme dans ton funnel ?

**Choix typiques** :
- `lead magnet gratuit pour générer des leads qualifiés` (programme gratuit, sert d'aimant)
- `produit d'appel à 49€ pour qualifier les leads chauds`
- `programme premium à 297€` (offre principale)
- `upsell pour clients existants`
- `événement gratuit pour la communauté`

**Conseil** : indique le **prix cible** si applicable. L'agent adapte la profondeur et la longueur en fonction.

---

## Champ 5 — Le contenu source (fichier upload)

**Formats acceptés** :
- ✅ PDF avec texte (rapport, livre blanc, slides exportés)
- ✅ Fichier `.txt` ou `.md`
- ✅ `.docx` (Word)
- ✅ Lien vers une page Notion (tu copies-colles le contenu)

**Formats à éviter** :
- ❌ PDF scanné (image, pas texte) → utilise un OCR avant
- ❌ Pages web complexes → simplifie avant

**Quantité optimale** : entre 5 et 30 pages. Au-delà, fournis un résumé synthétique.

---

## 📝 Exemple complet de brief

```
Audience :
Coachs et consultants indépendants (30-50 ans) qui veulent intégrer ChatGPT 
dans leur quotidien pour gagner 5h/semaine sur leur prep et leur veille. 
À l'aise avec Notion et Slack, mais bricolent ChatGPT sans méthode.

Format :
Challenge async 5 jours, ~30 min par jour, 1 unité par jour avec 3-4 steps.

Level :
Débutant à l'aise avec le numérique.

Business goal :
Programme freemium à 49€ — produit d'appel pour qualifier les leads chauds 
avant de pitcher mon offre coaching à 1500€.

Fichier source :
"playbook-prompt-engineering.pdf" (15 pages)
```

---

## 🎯 Checklist avant de soumettre

- [ ] **Audience précise** (qui galère à quoi ?)
- [ ] **Format clair** (combien de jours / heures / unités ?)
- [ ] **Niveau réaliste** (à quel point ils sont à l'aise ?)
- [ ] **Business goal** (gratuit / payant / quelle offre ?)
- [ ] **Fichier source propre** (PDF avec texte, pas image)

Si tu coches les 5 → l'agent va te sortir un programme propre dès le 1er essai.
Si tu coches 3-4 → tu vas devoir itérer un peu sur les prompts.
Si tu coches 1-2 → l'output sera générique, peu utilisable.

---

## 💡 Astuces avancées

### Tu veux un ton particulier ?
Ajoute dans le champ "Notes additionnelles" du form (à créer si besoin) :
- *"Ton : direct, un peu provocateur, comme Seth Godin"*
- *"Pas de jargon corporate, parle comme à un pote"*

### Tu veux re-générer un programme existant ?
Surtout pas. À la place :
- Édite directement les sections qui ne te plaisent pas dans Notion
- Ou re-soumets avec un brief plus précis pour produire un nouveau

### Tu veux un programme avec ton style perso ?
Garde un fichier "style-guide.md" avec :
- 2-3 paragraphes d'un programme que TU as écrit toi-même et qui te plaît
- Ajoute-le en référence dans le prompt 3 (rédacteur)
- Le résultat aura ton ton naturel
