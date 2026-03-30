# Audit SEO IA + PACA (Notion Publisher)

Date: 2026-02-06  
Scope: audit codebase + stratégie SEO local (PACA) + plan blog + backlog d'implémentation.

## Missing Inputs
- `SITE_URL` non fourni (pas de crawl live complet possible).
- `SERVICES_IA`, `TARGETS`, `CITIES`, `COMPETITORS`, `CTA` non fournis.
- Données GSC/GA4/GBP non fournies.

## Hypothèses
- Offre: services IA (formation, accompagnement, automatisation, innovation).
- Zone: PACA, avec focus Marseille, Aix, Nice, Toulon, Avignon.
- Objectif: trafic qualifié + leads.

## 1) Executive Summary
- Le socle SEO technique est incomplet: sitemap minimal, robots non implémenté.
- Aucune stratégie metadata globale/page (title, meta description, canonical, OG).
- Aucun schema.org (Organization, LocalBusiness, Article, FAQ, Breadcrumb).
- Le modèle Notion/KV ne porte pas encore de champs SEO dédiés.
- Le blog existe mais sans taxonomie/pagination SEO.
- Risque d'indexation de pages utilitaires (gate/preview) sans noindex.
- Potentiel fort via pages piliers "IA + PACA" et pages locales utiles.
- Priorité: corriger fondations techniques avant d'accélérer la production de contenu.
- Stratégie recommandée: 1 page pilier régionale + pages service + pages villes prioritaires.
- Plan éditorial 12 semaines prêt à exécuter (quick wins + core + long tail).

## 2) Scorecard SEO
| Axe | Score /10 | Justification |
|---|---:|---|
| Tech SEO | 2.5 | Sitemap/robots/metadata/schema insuffisants |
| Content SEO | 4.0 | Contenu possible via Notion mais structure SEO faible |
| Local SEO | 2.0 | Peu de signaux locaux structurés |
| Authority | 2.5 | Aucune stratégie backlinks visible dans la base |
| UX/Conversion SEO | 5.5 | UI propre mais parcours SEO -> lead peu structuré |

## 3) Audit Technique (problème -> impact -> correction -> effort)
| Problème | Impact | Correction | Effort |
|---|---|---|---|
| `src/app/sitemap.ts` ne sort que `/` | Découverte/indexation très limitée | Générer un sitemap dynamique (pages + blog + lastModified) | M |
| `src/app/robot.ts` vide (et mauvais nom) | Robots non maîtrisé | Créer `src/app/robots.ts` + `Sitemap:` | S |
| Pas de metadata globale (`layout`) | CTR faible, snippets non contrôlés | Ajouter metadata par défaut + template title | S |
| Pas de metadata page/article | Mauvaise captation intentionnelle | Ajouter `generateMetadata` sur routes dynamiques | M |
| Aucun JSON-LD | Pas de rich results potentiels | Ajouter Organization/LocalBusiness/Article/FAQ | M |
| Pages utilitaires potentiellement indexables | Pollution index | Mettre `noindex,nofollow` sur `/gate`, `/marketing-preview` | S |
| Blog sans pagination/taxonomie | Crawl + maillage faibles | Ajouter pagination + catégories/tags | M |
| Images Notion en `<img>` | Perf (LCP/CLS) sous-optimale | Migrer vers `next/image` quand possible | M |
| Modèle SEO Notion absent | SEO non pilotable sans dev | Étendre champs Notion + sync + KV | M |

## 4) Audit des Pages Clés
| Page | Intent | État actuel | Recommandation |
|---|---|---|---|
| `/` | Marque + offre + conversion | Positionnement SEO non explicite | H1 orienté "IA en PACA", offres, preuves locales, CTA |
| `/blog` | TOFU/MOFU | Listing simple, sans taxonomie | Ajouter catégories, pagination, intro SEO |
| `/blog/[slug]` | Requête spécifique | Pas de metadata/schema dédiés | `generateMetadata` + Article schema + CTA contextualisé |
| `/{slug}` (Notion) | Landing/offres | Très flexible mais pas standardisé SEO | Modèle SEO piloté Notion (title/meta/FAQ/indexable) |
| `/contact` | BOFU conversion | Présence supposée mais non auditée en détail | Renforcer preuve locale + friction faible |

## 5) Carte Sémantique IA + PACA
| Cluster | Exemples mots-clés | Page cible |
|---|---|---|
| IA + PACA | agence ia paca, accompagnement ia paca | `/ia-paca` |
| IA + ville | ia marseille, ia aix-en-provence, ia nice | `/ia-marseille`, `/ia-aix-en-provence`, `/ia-nice` |
| IA + service | formation ia paca, automatisation ia paca | `/formation-ia-paca`, `/automatisation-ia-paca` |
| IA + secteur | ia rh paca, ia industrie paca | `/ia-rh-paca`, `/ia-industrie-paca` |
| IA + conformité | ia act pme, rgpd ia | `/guide-ia-act-rgpd` |

## 6) Pages Locales Recommandées
### Liste prioritaire
- `/ia-paca`
- `/ia-marseille`
- `/ia-aix-en-provence`
- `/ia-nice`
- `/ia-toulon`
- `/ia-avignon`
- `/formation-ia-paca`
- `/automatisation-ia-paca`

### Template de landing locale (anti-duplication)
1. H1: Service + ville/région.
2. Intro: problème local concret.
3. Offre: ce qui est livré (format, délai, résultats).
4. Preuves locales: cas, témoignages, ateliers, événements.
5. FAQ locale (5 questions).
6. CTA clair (RDV / contact).
7. Maillage interne vers pages service + articles cluster.

### Règles anti-duplication
- Minimum 40% de contenu spécifique par ville.
- Aucune page locale sans preuve locale tangible.
- Limiter aux villes à potentiel business réel.

## 7) Plan Blog 12 Semaines
| Semaine | Niveau | Mot-clé principal | Intention | CTA | Page cible |
|---|---|---|---|---|---|
| 1 | Quick win | formation ia marseille entreprise | BOFU | Audit 30 min | `/formation-ia-paca` |
| 2 | Quick win | automatisation ia paca | BOFU | Diagnostic | `/automatisation-ia-paca` |
| 3 | Quick win | agence ia aix en provence | BOFU | Prendre RDV | `/ia-aix-en-provence` |
| 4 | Core | ia pour rh paca | MOFU | Atelier découverte | `/ia-rh-paca` |
| 5 | Core | ia generative entreprise paca | MOFU | Télécharger roadmap | `/ia-paca` |
| 6 | Long tail | copilote ia service client marseille | MOFU | Audit cas d'usage | `/automatisation-ia-paca` |
| 7 | Quick win | formation chatgpt entreprise nice | BOFU | Réserver session | `/formation-ia-paca` |
| 8 | Core | ia industrie paca | MOFU | Étude de faisabilité | `/ia-industrie-paca` |
| 9 | Long tail | ia act pme france 2026 | TOFU/MOFU | Audit conformité | `/guide-ia-act-rgpd` |
| 10 | Core | cas client ia paca | BOFU | Planifier un échange | `/cas-clients-ia-paca` |
| 11 | Long tail | agents ia entreprise paca | MOFU | Diagnostic architecture | `/agents-ia-paca` |
| 12 | Core | ia collectivites paca | MOFU | Atelier secteur public | `/ia-secteur-public-paca` |

## 8) 5 Briefs d'Articles (synthèse prête à rédiger)
### Brief 1
- Titre SEO: Formation IA en entreprise à Marseille: méthode, budget, résultats.
- KW: `formation ia marseille entreprise`.
- Angle: guide décision + ROI.
- H2: besoins, formats, budget, KPI, FAQ.
- CTA: audit 30 min.

### Brief 2
- Titre SEO: Automatisation IA en PACA: 7 processus à fort ROI pour PME.
- KW: `automatisation ia paca`.
- Angle: priorisation opérationnelle.
- H2: sales, support, ops, RH, gouvernance, FAQ.
- CTA: diagnostic.

### Brief 3
- Titre SEO: IA pour les RH en PACA: 10 cas d'usage concrets.
- KW: `ia rh paca`.
- Angle: cas d'usage + garde-fous.
- H2: recrutement, onboarding, support RH, risques, plan 60 jours.
- CTA: atelier RH.

### Brief 4
- Titre SEO: IA Act pour PME: plan d'action 2026.
- KW: `ia act pme france 2026`.
- Angle: conformité pragmatique.
- H2: obligations, documentation, gouvernance, roadmap 30-60-90.
- CTA: audit conformité.

### Brief 5
- Titre SEO: Cas client IA en PACA: de 0 à un pilote en 6 semaines.
- KW: `cas client ia paca`.
- Angle: preuve locale et reproductibilité.
- H2: contexte, méthode, résultats, erreurs évitées, checklist.
- CTA: planifier un échange.

## 9) Backlog Priorisé (Impact x Effort x Dépendances)
### Quick wins (<= 2h)
1. Créer `robots.ts`.
2. Corriger/étendre `sitemap.ts`.
3. Ajouter metadata globale dans `layout`.
4. Ajouter noindex sur pages utilitaires.
5. Corriger logo header en lien vers `/`.

### Sprint 1 (1-2 jours)
1. `generateMetadata` sur pages dynamiques/blog.
2. Canonical propre par page.
3. Modèle SEO Notion minimal (`seo_title`, `seo_description`, `indexable`, `canonical`).
4. JSON-LD Organization/LocalBusiness global.
5. JSON-LD Article sur blog post.

### Sprint 2 (3-5 jours)
1. Sitemap dynamique complet (indexables business).
2. Pagination + taxonomie blog.
3. Optimisation image Notion (`next/image`).
4. Pages piliers service + région.
5. 5 pages locales non dupliquées.

### Sprint content
1. Publier 12 articles.
2. Maillage interne systématique.
3. FAQ + FAQ schema sur pages BOFU.
4. Cas clients locaux structurés.
5. Optimisation conversion SEO -> lead.

## 10) Checklist Déploiement (pré-prod -> prod)
- `robots.txt` valide et accessible.
- `sitemap.xml` contient toutes les pages business.
- Titles/meta descriptions uniques.
- Canonicals cohérents.
- Pages utilitaires en noindex.
- Schema.org valide (test rich results).
- Maillage interne minimum respecté.
- Aucune 404 stratégique.
- Tracking conversions en place.
- Validation mobile (UX + performance).

## Top 15 Actions (ordre recommandé)
1. Implémenter `robots.ts`.
2. Étendre `sitemap.ts`.
3. Ajouter metadata globale.
4. Ajouter metadata dynamique par page.
5. Ajouter noindex utilitaires.
6. Étendre modèle SEO Notion.
7. Propager champs SEO dans sync/KV.
8. Ajouter JSON-LD Organization/LocalBusiness.
9. Ajouter JSON-LD Article/FAQ.
10. Créer page pilier `/ia-paca`.
11. Créer 3 pages services IA régionales.
12. Créer 5 pages locales prioritaires.
13. Lancer plan éditorial 12 semaines.
14. Ajouter pagination/taxonomie blog.
15. Renforcer les pages SEO côté conversion (preuves + CTA).
