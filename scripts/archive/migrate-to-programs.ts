#!/usr/bin/env node
/**
 * Migration one-shot : hubs + sprints → Programs/Units/Steps unifiés.
 *
 * Usage :
 *   npm run migrate:v2 -- --dry-run   # loguer sans écrire
 *   npm run migrate:v2                # écrire pour de vrai
 *
 * Étapes :
 *   1. Lit tous les hubs  → crée 1 Program(type=async) chacun
 *   2. Pour chaque hub, lit ses Jours → crée 1 Unit chacun lié au Program
 *   3. Pour chaque Jour, lit ses Activités → crée 1 Step chacun lié à l'Unit
 *   4. Idem pour sprints (type=sync → Units = Modules → Steps = Activities)
 *   5. Rewire les cohortes : ajoute relation program sur chaque cohorte
 *
 * Les anciennes DBs restent intactes (backup).
 *
 * Mapping fields hub → program :
 *   Title → Title
 *   slug → slug
 *   description → description
 *   publishing_status → publishing_status
 *   visibility → visibility
 *   password → password
 *   cover_image → cover_image
 *   thumbnail → thumbnail
 *   instructors → instructors (remappé via new relation)
 *   estimated_duration_minutes → estimated_duration_minutes
 *   target_audience → target_audience
 *   prerequisites → prerequisites
 *   learning_outcomes → learning_outcomes
 *   certificate_enabled → certificate_enabled
 *   (no start_datetime for hubs)
 *   type ← 'async' (hardcodé)
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env.local (not just .env) — Next.js convention
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const NOTION_TOKEN = process.env.NOTION_TOKEN!;
const DRY_RUN = process.argv.includes('--dry-run');

// Source DBs (data_source_ids, extraits de V2_NOTION_IDS.md)
const HUBS_DS = '2867fdb7-6b00-8073-b979-000b1dc8e834';
const SPRINTS_DS = '2977fdb7-6b00-80d6-83d0-000b2b7f6234';
const HUBS_JOURS_DS = '2bc7fdb7-6b00-8175-a992-000b97c30133';
const SPRINT_MODULES_DS = '2977fdb7-6b00-8002-b2c8-000b7b3943b7';
const HUBS_STEPS_DS = '2bc7fdb7-6b00-812c-a983-000b7a31a9f7';
const SPRINT_STEPS_DS = '2977fdb7-6b00-80ac-ac90-000b75312d38';
const COHORTES_DS = '2967fdb7-6b00-80cb-8624-000bf681f036';

// Target DBs v2 — data_source_ids (pour query) et database_ids (pour create pages)
const PROGRAMS_DS = '599e2e0a-66cf-4e4f-817e-357776e81cc7';
const UNITS_DS = '53b31da7-7d24-4637-af02-aa37488ee0b4';
const STEPS_DS = 'f2fc8d7e-cdc2-4378-9758-8955b5772db4';

const PROGRAMS_DB = 'f503624f-ff66-4b43-80d2-e1c5cdcf67b5';
const UNITS_DB = '9d7546bf-b207-4aa7-b197-716d4b2abb52';
const STEPS_DB = 'ce9bdf9f-6355-4e6a-a14e-129f8c5b4582';

type NotionPage = {
  id: string;
  properties: Record<string, any>;
};

async function notionFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`https://api.notion.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2025-09-03',
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || json.object === 'error') {
    throw new Error(`Notion API ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
  }
  return json;
}

async function queryAll(dsId: string): Promise<NotionPage[]> {
  const out: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const body: any = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const r = await notionFetch(`/data_sources/${dsId}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    out.push(...r.results);
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return out;
}

// ─── Property helpers ───

const rt = (p: any): string => {
  if (!p) return '';
  const arr = p.type === 'title' ? p.title : p.rich_text;
  return (arr ?? []).map((t: any) => t.plain_text ?? '').join('').trim();
};
const num = (p: any): number | null => (p?.type === 'number' ? p.number ?? null : null);
const sel = (p: any): string | null => (p?.type === 'select' ? p.select?.name ?? null : null);
const cbx = (p: any): boolean => (p?.type === 'checkbox' ? !!p.checkbox : false);
const dateStart = (p: any): string | null => (p?.type === 'date' ? p.date?.start ?? null : null);
const relIds = (p: any): string[] => (p?.type === 'relation' ? (p.relation ?? []).map((r: any) => r.id) : []);
const files = (p: any): Array<{ type: 'external' | 'file'; url: string }> => {
  if (p?.type !== 'files') return [];
  return (p.files ?? []).map((f: any) => {
    if (f.type === 'external') return { type: 'external', url: f.external?.url };
    return { type: 'file', url: f.file?.url };
  }).filter((f: any) => f.url);
};

// ─── Build v2 props from legacy page ───

function buildProgramProps(src: NotionPage, type: 'async' | 'sync'): any {
  const p = src.properties;
  const title = rt(p.Title) || rt(p.Name) || rt(p.title);
  const slug = rt(p.slug);
  if (!slug) return null;

  const props: any = {
    Title: { title: [{ type: 'text', text: { content: title } }] },
    slug: { rich_text: [{ type: 'text', text: { content: slug } }] },
    type: { select: { name: type } },
  };

  const desc = rt(p.description) || rt(p.context);
  if (desc) props.description = { rich_text: [{ type: 'text', text: { content: desc } }] };

  const pubStatus = sel(p.publishing_status);
  if (pubStatus) props.publishing_status = { select: { name: pubStatus } };

  const visibility = sel(p.visibility);
  if (visibility) props.visibility = { select: { name: visibility } };

  const pwd = rt(p.password);
  if (pwd) props.password = { rich_text: [{ type: 'text', text: { content: pwd } }] };

  // Notion n'autorise pas les external URLs pointant sur prod-files-secure.s3.us-west-2.amazonaws.com
  // On ne copie QUE les URLs vraiment externes (Cloudinary, etc.). Les Notion-hosted sont
  // re-uploadées à la main par le user après migration (voir V2_NOTION_IDS.md §TODO).
  const isNotionHosted = (url: string) =>
    url.includes('prod-files-secure.s3') ||
    url.includes('secure.notion-static.com') ||
    url.includes('amazonaws.com');

  const cover = files(p.cover_image).filter((f) => f.type === 'external' && !isNotionHosted(f.url));
  if (cover.length) {
    props.cover_image = {
      files: cover.map((f, i) => ({
        name: `cover-${i}`,
        type: 'external',
        external: { url: f.url },
      })),
    };
  } else if (files(p.cover_image).length > 0) {
    console.log(`    ⚠️  cover_image skipped (Notion-hosted, needs re-upload after migration)`);
  }

  const thumb = files(p.thumbnail).filter((f) => f.type === 'external' && !isNotionHosted(f.url));
  if (thumb.length) {
    props.thumbnail = {
      files: thumb.map((f, i) => ({
        name: `thumb-${i}`,
        type: 'external',
        external: { url: f.url },
      })),
    };
  } else if (files(p.thumbnail).length > 0) {
    console.log(`    ⚠️  thumbnail skipped (Notion-hosted, needs re-upload after migration)`);
  }

  const inst = relIds(p.instructors);
  if (inst.length) props.instructors = { relation: inst.map((id) => ({ id })) };

  const est = num(p.estimated_duration_minutes);
  if (est != null) props.estimated_duration_minutes = { number: est };

  const ta = rt(p.target_audience);
  if (ta) props.target_audience = { rich_text: [{ type: 'text', text: { content: ta } }] };

  const pre = rt(p.prerequisites);
  if (pre) props.prerequisites = { rich_text: [{ type: 'text', text: { content: pre } }] };

  const lo = rt(p.learning_outcomes);
  if (lo) props.learning_outcomes = { rich_text: [{ type: 'text', text: { content: lo } }] };

  if (p.certificate_enabled?.type === 'checkbox')
    props.certificate_enabled = { checkbox: cbx(p.certificate_enabled) };

  const start = dateStart(p.startDateTime) || dateStart(p.start_datetime);
  if (start) props.start_datetime = { date: { start } };

  const tz = rt(p.timezone) || sel(p.timezone);
  if (tz) props.timezone = { rich_text: [{ type: 'text', text: { content: tz } }] };

  const cap = num(p.capacity);
  if (cap != null) props.capacity = { number: cap };

  return { props, title, slug };
}

function buildUnitProps(src: NotionPage, programId: string, kind: 'jour' | 'module'): any {
  const p = src.properties;
  const title =
    rt(p.titre) ||
    rt(p.Name) ||
    rt(p.Jours) ||
    rt(p.Title) ||
    (kind === 'jour' ? 'Jour' : 'Module');

  const slug = rt(p.slug) || '';

  const props: any = {
    Title: { title: [{ type: 'text', text: { content: title } }] },
    program: { relation: [{ id: programId }] },
  };
  if (slug) props.slug = { rich_text: [{ type: 'text', text: { content: slug } }] };

  const order = num(p.Ordre) ?? num(p.order) ?? num(p.ordre);
  if (order != null) props.order = { number: order };

  const duration = num(p.duration) ?? num(p.durée);
  if (duration != null) props.duration_minutes = { number: duration };

  const unlockOffset = num(p.unlock_offset);
  if (unlockOffset != null) props.unlock_offset_days = { number: unlockOffset };

  const dayIndex = num(p.day_index);
  if (dayIndex != null) props.day_index = { number: dayIndex };

  const unlockAt = dateStart(p.unlock_at);
  if (unlockAt) props.unlock_at = { date: { start: unlockAt } };

  const objective = rt(p.objectif) || rt(p.objective);
  if (objective) props.objective = { rich_text: [{ type: 'text', text: { content: objective } }] };

  const deliverable = rt(p.livrable);
  if (deliverable) props.deliverable = { rich_text: [{ type: 'text', text: { content: deliverable } }] };

  return { props, title, slug };
}

function buildStepProps(src: NotionPage, unitId: string, kind: 'hub-act' | 'sprint-act'): any {
  const p = src.properties;
  const title = rt(p.title) || rt(p.Name) || rt(p.titre) || 'Step';
  const internalId = rt(p.internal_id) || rt(p.Titre);
  const slug = rt(p.slug) || '';

  const props: any = {
    Title: { title: [{ type: 'text', text: { content: title } }] },
    unit: { relation: [{ id: unitId }] },
  };
  if (internalId) props.internal_id = { rich_text: [{ type: 'text', text: { content: internalId } }] };
  if (slug) props.slug = { rich_text: [{ type: 'text', text: { content: slug } }] };

  const order = num(p.order) ?? num(p.ordre);
  if (order != null) props.order = { number: order };

  const type = sel(p.type);
  if (type) {
    // Normalize: spotlight → intro, Intro/intro → intro
    const normalized = type.toLowerCase() === 'spotlight' ? 'intro' : type.toLowerCase();
    if (['intro', 'step', 'conclusion', 'option'].includes(normalized)) {
      props.type = { select: { name: normalized } };
    }
  }

  const duration = num(p.duration);
  if (duration != null) props.duration_minutes = { number: duration };

  if (p.check?.type === 'checkbox') props.requires_check = { checkbox: cbx(p.check) };

  const summary = rt(p.contenu) || rt(p.summary);
  if (summary) props.summary = { rich_text: [{ type: 'text', text: { content: summary } }] };

  return { props, title };
}

async function createPage(parentDbId: string, properties: any): Promise<string> {
  if (DRY_RUN) return 'DRY-RUN-id';
  const r = await notionFetch('/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'database_id', database_id: parentDbId },
      properties,
    }),
  });
  return r.id;
}

// ─── Main migration ───

async function migrateHubs() {
  console.log('\n━━━━ Migrating HUBS → Programs(type=async) ━━━━');
  const hubs = await queryAll(HUBS_DS);
  console.log(`Found ${hubs.length} hubs\n`);

  const allJours = await queryAll(HUBS_JOURS_DS);
  const allSteps = await queryAll(HUBS_STEPS_DS);
  console.log(`Preloaded ${allJours.length} jours, ${allSteps.length} hub-steps\n`);

  for (const hub of hubs) {
    const built = buildProgramProps(hub, 'async');
    if (!built) {
      console.log(`  SKIP hub ${hub.id.slice(0, 8)} — no slug`);
      continue;
    }
    console.log(`▸ Hub "${built.title}" [${built.slug}]`);
    const programId = await createPage(PROGRAMS_DB, built.props);
    console.log(`    → Program ${programId.slice(0, 8)}${DRY_RUN ? ' (dry)' : ''}`);

    // Find Jours linked to this hub (via Hubs relation)
    const linkedJours = allJours.filter((j) => {
      const r = relIds(j.properties.Hubs);
      return r.includes(hub.id);
    });

    for (const jour of linkedJours) {
      const unitBuilt = buildUnitProps(jour, programId, 'jour');
      const unitId = await createPage(UNITS_DB, unitBuilt.props);
      console.log(`       · Unit "${unitBuilt.title}" ${unitId.slice(0, 8)}${DRY_RUN ? ' (dry)' : ''}`);

      // Steps linked to this Jour
      const linkedSteps = allSteps.filter((s) => {
        const r = relIds(s.properties.jour);
        return r.includes(jour.id);
      });
      for (const step of linkedSteps) {
        const stepBuilt = buildStepProps(step, unitId, 'hub-act');
        const stepId = await createPage(STEPS_DB, stepBuilt.props);
        console.log(`           · Step "${stepBuilt.title}" ${stepId.slice(0, 8)}${DRY_RUN ? ' (dry)' : ''}`);
      }
    }
  }
}

async function migrateSprints() {
  console.log('\n━━━━ Migrating SPRINTS → Programs(type=sync) ━━━━');
  const sprints = await queryAll(SPRINTS_DS);
  console.log(`Found ${sprints.length} sprints\n`);

  const allModules = await queryAll(SPRINT_MODULES_DS);
  const allActs = await queryAll(SPRINT_STEPS_DS);
  console.log(`Preloaded ${allModules.length} modules, ${allActs.length} sprint-activities\n`);

  for (const sprint of sprints) {
    const built = buildProgramProps(sprint, 'sync');
    if (!built) {
      console.log(`  SKIP sprint ${sprint.id.slice(0, 8)} — no slug`);
      continue;
    }
    console.log(`▸ Sprint "${built.title}" [${built.slug}]`);
    const programId = await createPage(PROGRAMS_DB, built.props);
    console.log(`    → Program ${programId.slice(0, 8)}${DRY_RUN ? ' (dry)' : ''}`);

    const linkedModules = allModules.filter((m) => {
      const r = relIds(m.properties['DB Sprints']);
      return r.includes(sprint.id);
    });

    for (const mod of linkedModules) {
      const unitBuilt = buildUnitProps(mod, programId, 'module');
      const unitId = await createPage(UNITS_DB, unitBuilt.props);
      console.log(`       · Unit "${unitBuilt.title}" ${unitId.slice(0, 8)}${DRY_RUN ? ' (dry)' : ''}`);

      const linkedActs = allActs.filter((a) => {
        const r = relIds(a.properties['DB Modules']);
        return r.includes(mod.id);
      });
      for (const act of linkedActs) {
        const stepBuilt = buildStepProps(act, unitId, 'sprint-act');
        const stepId = await createPage(STEPS_DB, stepBuilt.props);
        console.log(`           · Step "${stepBuilt.title}" ${stepId.slice(0, 8)}${DRY_RUN ? ' (dry)' : ''}`);
      }
    }
  }
}

async function main() {
  console.log(`Migration v2 — ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE MODE (writes to Notion)'}\n`);
  if (!NOTION_TOKEN) {
    console.error('NOTION_TOKEN missing.');
    process.exit(1);
  }
  const started = Date.now();
  await migrateHubs();
  await migrateSprints();
  console.log(`\n━━━━ Done in ${Math.round((Date.now() - started) / 1000)}s ━━━━`);
  if (DRY_RUN) {
    console.log('DRY RUN — no pages were created.');
    console.log('Re-run without --dry-run to apply.');
  }
}

main().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
