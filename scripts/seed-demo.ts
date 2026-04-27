#!/usr/bin/env node
/**
 * Seed démo — crée un programme exemple "Challenge Starter" dans la DB Programs.
 *
 * Usage :
 *   npm run seed:demo
 *
 * Le programme créé est marqué en `draft` pour ne pas apparaître en prod.
 * À toi de le passer en `published` quand tu veux le montrer.
 *
 * Structure créée :
 *   Programme "Challenge Starter" (3 jours async)
 *     ├── Jour 1 — Démarrer
 *     │     ├── Accueil (intro)
 *     │     ├── Exercice pratique
 *     │     └── Livrable
 *     ├── Jour 2 — Approfondir
 *     │     ├── Accueil / Exercice / Livrable
 *     └── Jour 3 — Célébrer
 *           ├── Accueil / Exercice / Conclusion
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const token = process.env.NOTION_TOKEN;
const programsDbId = process.env.NOTION_PROGRAMS_DB;

if (!token) {
  console.error('✗ NOTION_TOKEN manquant dans .env.local');
  process.exit(1);
}
if (!programsDbId) {
  console.error('✗ NOTION_PROGRAMS_DB manquant dans .env.local');
  process.exit(1);
}

type Block = Record<string, unknown>;

async function notionFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status} on ${init?.method ?? 'GET'} ${path}: ${body}`);
  }
  return (await r.json()) as T;
}

// ─── Block builders ───

function rt(content: string, annotations?: Record<string, boolean>) {
  const obj: Record<string, unknown> = { type: 'text', text: { content } };
  if (annotations) obj.annotations = annotations;
  return obj;
}
function paragraph(text: string): Block {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: [rt(text)] } };
}
function heading(level: 1 | 2 | 3, text: string): Block {
  const key = `heading_${level}`;
  return { object: 'block', type: key, [key]: { rich_text: [rt(text)] } };
}
function divider(): Block {
  return { object: 'block', type: 'divider', divider: {} };
}
function bullet(text: string): Block {
  return {
    object: 'block',
    type: 'bulleted_list_item',
    bulleted_list_item: { rich_text: [rt(text)] },
  };
}
function callout(emoji: string, title: string, items: string[]): Block {
  return {
    object: 'block',
    type: 'callout',
    callout: {
      rich_text: [rt(title, { bold: true })],
      icon: { type: 'emoji', emoji },
      color: 'default',
      children: items.map((t) => bullet(t)),
    },
  };
}
function configCallout(items: string[]): Block {
  return callout('⚙️', 'Config', items);
}
function resourcesCallout(items: string[]): Block {
  return callout('📌', 'Ressources du programme', items);
}
function quote(text: string): Block {
  return { object: 'block', type: 'quote', quote: { rich_text: [rt(text)] } };
}

// ─── API helpers ───

async function createPage(opts: {
  parent: { database_id: string } | { page_id: string };
  properties?: Record<string, unknown>;
  title?: string;
  icon?: string;
  children?: Block[];
}): Promise<string> {
  const body: Record<string, unknown> = {
    parent: opts.parent,
    properties: opts.properties ?? {
      title: { title: [rt(opts.title ?? 'Untitled')] },
    },
  };
  if (opts.icon) body.icon = { type: 'emoji', emoji: opts.icon };
  if (opts.children && opts.children.length > 0) body.children = opts.children;

  const r = await notionFetch<{ id: string }>('/pages', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return r.id;
}

async function appendBlocks(pageId: string, blocks: Block[]) {
  for (let i = 0; i < blocks.length; i += 90) {
    const chunk = blocks.slice(i, i + 90);
    await notionFetch(`/blocks/${pageId}/children`, {
      method: 'PATCH',
      body: JSON.stringify({ children: chunk }),
    });
  }
}

// ─── Content ───

function programBody(): Block[] {
  return [
    heading(1, 'Bienvenue dans Challenge Starter 🚀'),
    paragraph(
      'Ce programme démo te montre la structure d’un parcours asynchrone de 3 jours. ' +
        'Utilise-le comme modèle pour créer tes propres programmes.',
    ),
    paragraph(
      'Remplace ce texte par ton intro : pour qui c’est fait, ce que l’apprenant va apprendre, ' +
        'comment le programme se déroule.',
    ),
    divider(),
    heading(2, 'Pour qui ?'),
    paragraph('Décris ici ton audience cible (2-3 lignes).'),
    heading(2, 'Ce que tu vas apprendre'),
    bullet('Premier apprentissage clé'),
    bullet('Deuxième apprentissage clé'),
    bullet('Troisième apprentissage clé'),
    divider(),
    resourcesCallout([
      '📄 Workbook PDF (lien à ajouter)',
      '💬 Rejoindre la communauté',
      '🎥 Replay du kick-off',
    ]),
  ];
}

function unitBody(day: number, theme: string): Block[] {
  const duration = 30 + day * 10;
  return [
    configCallout([
      `Durée : ${duration} min`,
      `Déverrouillage : J+${day - 1}`,
      'Accès : gratuit',
    ]),
    paragraph(`Aujourd'hui on se concentre sur : ${theme}.`),
    quote(
      '« Remplace cette citation par quelque chose qui met le ton de la journée. »',
    ),
  ];
}

type StepKind = 'intro' | 'step' | 'step-check' | 'conclusion';

function stepBody(kind: StepKind, stepTitle: string): Block[] {
  const config: Record<StepKind, string[]> = {
    intro: ['Durée : 5 min', 'Type : intro'],
    step: ['Durée : 15 min'],
    'step-check': ['Durée : 10 min', 'Validation requise : oui'],
    conclusion: ['Durée : 10 min', 'Type : conclusion'],
  };
  const bodyByKind: Record<StepKind, Block[]> = {
    intro: [
      heading(1, stepTitle),
      heading(2, 'Objectif du jour'),
      paragraph(
        'Explique en 2-3 lignes ce que l’apprenant va accomplir aujourd’hui.',
      ),
      bullet('Premier objectif'),
      bullet('Deuxième objectif'),
    ],
    step: [
      heading(1, stepTitle),
      heading(2, 'Le concept'),
      paragraph('Explique le concept clé de cette étape.'),
      heading(2, "L'exercice"),
      paragraph('Décris l’exercice concret à faire.'),
    ],
    'step-check': [
      heading(1, stepTitle),
      heading(2, 'Livrable'),
      paragraph(
        'Indique clairement ce que l’apprenant doit produire pour valider ce module.',
      ),
      paragraph('Ce step est marqué "validation requise" — à cocher avant de passer au suivant.'),
    ],
    conclusion: [
      heading(1, stepTitle),
      heading(2, 'Ce que tu emportes'),
      paragraph('Résume les 3-5 apprentissages clés du programme.'),
      quote('« Un message de clôture inspirant. »'),
    ],
  };
  return [configCallout(config[kind]), ...bodyByKind[kind]];
}

// ─── Main ───

async function main() {
  console.log('🌱 Seeding "Challenge Starter" demo program...\n');

  // 1. Create program row
  const slug = 'challenge-starter-demo';
  const programId = await createPage({
    parent: { database_id: programsDbId! },
    properties: {
      Title: { title: [rt('Challenge Starter (démo)')] },
      slug: { rich_text: [rt(slug)] },
      type: { select: { name: 'async' } },
      visibility: { select: { name: 'public' } },
      publishing_status: { select: { name: 'draft' } },
      description: {
        rich_text: [
          rt('Programme démo généré — 3 jours pour découvrir la structure du LMS.'),
        ],
      },
      certificate_enabled: { checkbox: true },
    },
    icon: '🧩',
  });
  console.log(`  ✓ Programme créé : ${programId.slice(0, 8)} (slug=${slug})`);

  await appendBlocks(programId, programBody());
  console.log('  ✓ Body du programme rempli');

  // 2. Create 3 units, each with 3 steps
  const units = [
    { title: 'Jour 1 — Démarrer', theme: 'poser les fondations' },
    { title: 'Jour 2 — Approfondir', theme: "entrer dans le coeur du sujet" },
    { title: 'Jour 3 — Célébrer', theme: 'ancrer tes apprentissages' },
  ];

  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const unitId = await createPage({
      parent: { page_id: programId },
      title: u.title,
      icon: '📅',
    });
    await appendBlocks(unitId, unitBody(i + 1, u.theme));
    console.log(`  ✓ Unit : ${u.title}`);

    const steps: Array<{ title: string; kind: StepKind; icon: string }> = [
      { title: 'Accueil', kind: 'intro', icon: '🎯' },
      { title: 'Exercice pratique', kind: 'step', icon: '📝' },
      {
        title: i === units.length - 1 ? 'Conclusion' : 'Livrable',
        kind: i === units.length - 1 ? 'conclusion' : 'step-check',
        icon: i === units.length - 1 ? '✅' : '📬',
      },
    ];

    for (const s of steps) {
      const stepId = await createPage({
        parent: { page_id: unitId },
        title: s.title,
        icon: s.icon,
      });
      await appendBlocks(stepId, stepBody(s.kind, s.title));
      console.log(`     · Step : ${s.title}`);
    }
  }

  console.log('\n✅ Seed terminé !');
  console.log(`   Programme "Challenge Starter (démo)" créé en mode DRAFT.`);
  console.log(`   Pour le rendre visible : passe publishing_status=published dans Notion,`);
  console.log(`   puis clique "Synchroniser Notion" dans /admin/programs.`);
  console.log(`\n   URL Notion : https://www.notion.so/${programId.replace(/-/g, '')}\n`);
}

main().catch((e) => {
  console.error('\n✗ Fatal:', e instanceof Error ? e.message : e);
  process.exit(1);
});
