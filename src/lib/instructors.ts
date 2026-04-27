import 'server-only';

import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { notion } from '@/lib/notion';
import { cacheGet, cacheSet } from '@/lib/cache';
import { mirrorRemoteImage } from '@/lib/media';
import type { InstructorMeta } from '@/lib/types';

const INSTRUCTORS_DB = process.env.NOTION_INSTRUCTORS_DB;
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const cacheKey = (id: string) => `instructor:${id}`;

/**
 * Mirror la photo Notion (S3 signed URL qui expire ~1h) vers Cloudinary
 * pour avoir une URL persistante. Fallback sur URL brute si mirror échoue.
 */
async function mirrorInstructorPhoto(
  sourceUrl: string | null,
  instructorId: string,
): Promise<string | null> {
  if (!sourceUrl) return null;
  try {
    const mirrored = await mirrorRemoteImage({
      sourceUrl,
      targetKey: `notion-instructors/${instructorId}/photo`,
    });
    return mirrored.url ?? sourceUrl;
  } catch (error) {
    console.warn('[instructors] photo mirror failed', { instructorId, error });
    return sourceUrl;
  }
}

function isFullPage(page: unknown): page is PageObjectResponse {
  return typeof page === 'object' && page !== null && (page as { object?: string }).object === 'page';
}

function getRichText(prop: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'rich_text') return prop.rich_text?.[0]?.plain_text?.trim() || null;
  if (prop.type === 'title') return prop.title?.[0]?.plain_text?.trim() || null;
  return null;
}

function getUrl(prop: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'url') return prop.url ?? null;
  return null;
}

function getEmail(prop: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'email') return prop.email ?? null;
  return null;
}

function getSelect(prop: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!prop) return null;
  if (prop.type === 'select') return prop.select?.name ?? null;
  return null;
}

function getFirstFileUrl(prop: PageObjectResponse['properties'][string] | undefined): string | null {
  if (!prop || prop.type !== 'files') return null;
  const f = prop.files?.[0];
  if (!f) return null;
  if (f.type === 'external') return f.external?.url ?? null;
  if (f.type === 'file') return f.file?.url ?? null;
  return null;
}

/**
 * Parse une page instructor. Reconnaît Name (title) / bio / photo / email /
 * linkedin / role. La photo est mirrorée vers Cloudinary côté caller
 * (parseInstructor reste synchrone).
 */
function parseInstructor(page: PageObjectResponse): InstructorMeta | null {
  const props = page.properties ?? {};
  const name =
    getRichText(props.Name) ||
    getRichText(props.name) ||
    getRichText(props.title);
  if (!name) return null;

  return {
    id: page.id,
    name,
    bio: getRichText(props.bio),
    photoUrl: getFirstFileUrl(props.photo),
    email: getEmail(props.email),
    linkedinUrl: getUrl(props.linkedin),
    role: getSelect(props.role),
  };
}

/**
 * Récupère un instructor par son page ID Notion.
 * La photo est automatiquement mirrorée vers Cloudinary (URL persistante).
 * Cache 5 min en mémoire (process-local, pas KV — les instructors changent rarement).
 */
export async function getInstructor(id: string): Promise<InstructorMeta | null> {
  if (!id) return null;

  const cached = cacheGet<InstructorMeta | null>(cacheKey(id));
  if (cached !== null && cached !== undefined) return cached;

  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!isFullPage(page)) return null;
    const meta = parseInstructor(page);
    if (!meta) return null;

    // Mirror photo Notion S3 → Cloudinary (persistant)
    if (meta.photoUrl) {
      meta.photoUrl = await mirrorInstructorPhoto(meta.photoUrl, id);
    }

    cacheSet(cacheKey(id), meta, CACHE_TTL);
    return meta;
  } catch (error) {
    console.warn('[instructors] retrieve failed', { id, error });
    return null;
  }
}

/**
 * Résout une liste d'IDs en objets InstructorMeta. Les IDs invalides sont filtrés.
 */
export async function resolveInstructors(ids: string[] | undefined | null): Promise<InstructorMeta[]> {
  if (!ids || ids.length === 0) return [];
  const results = await Promise.all(ids.map((id) => getInstructor(id)));
  return results.filter((i): i is InstructorMeta => i !== null);
}

/**
 * Variante cohortes — un seul lead instructor, optionnel.
 */
export async function resolveLeadInstructor(id: string | null | undefined): Promise<InstructorMeta | null> {
  if (!id) return null;
  return getInstructor(id);
}

export { INSTRUCTORS_DB };
