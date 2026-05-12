import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import type { AccessTier, StepType } from '@/lib/types';

/**
 * Parser du callout ⚙️ Config (structure Programs v3).
 *
 * Format attendu dans Notion :
 *   ⚙️ Config
 *   • Durée : 45 min
 *   • Déverrouillage : J+7
 *   • Accès : gratuit | payant | aperçu
 *   • Type : intro | étape | conclusion | bonus
 *   • Validation requise : oui | non
 *
 * Le parser est tolérant :
 *   - accents (É/É/é), majuscules/minuscules
 *   - formats de durée : "45 min", "1h", "1h30", "90 min", "1 heure"
 *   - formats de date : "J+7", "7 jours", "2026-05-15", "immédiat"
 *   - synonymes français/anglais pour les clés (Durée/Duration, Accès/Access...)
 *
 * Défauts : tout est optionnel. Si un champ manque ou est mal parsé, on retourne
 * `undefined` pour ce champ et le caller applique son défaut intelligent.
 */

export type UnitConfig = {
  durationMinutes?: number;
  unlockOffsetDays?: number;
  unlockAt?: string; // ISO date si format absolu
  accessTier?: AccessTier;
};

export type StepConfig = {
  durationMinutes?: number;
  type?: StepType;
  requiresCheck?: boolean;
};

type AugmentedBlock = BlockObjectResponse & { __children?: BlockObjectResponse[] };

/** Normalise : minuscules, sans accents, sans espaces de fin. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Extrait le texte plain d'un rich_text array. */
function plainText(rich: Array<{ plain_text?: string }> | undefined): string {
  return (rich ?? []).map((r) => r.plain_text ?? '').join('').trim();
}

/** Retourne true si le block est le callout ⚙️ Config. */
export function isConfigCallout(block: BlockObjectResponse): boolean {
  if (block.type !== 'callout') return false;
  const icon = block.callout.icon;
  if (icon?.type !== 'emoji') return false;
  return icon.emoji === '⚙️' || icon.emoji === '⚙';
}

/** Retourne true si le block est un callout 📌 (ressources épinglées). */
export function isPinnedCallout(block: BlockObjectResponse): boolean {
  if (block.type !== 'callout') return false;
  const icon = block.callout.icon;
  if (icon?.type !== 'emoji') return false;
  return icon.emoji === '📌';
}

/** Extrait les bullets enfants d'un callout sous forme de lignes de texte.
 *
 * Trois formats supportés (par ordre de priorité) :
 *   1. Children blocks de type bulleted_list_item (format canonique)
 *   2. Children blocks de type paragraph (un par ligne)
 *   3. Rich_text du callout lui-même, splitté sur newlines (fallback pour les
 *      callouts écrits en ligne unique avec Shift+Enter — un piège fréquent
 *      quand l'utilisateur tape ⚙️ Config puis des "• Durée..." à la suite).
 */
function extractBullets(callout: AugmentedBlock): string[] {
  const children = callout.__children ?? [];
  const out: string[] = [];
  for (const child of children) {
    if (child.type === 'bulleted_list_item') {
      const text = plainText(child.bulleted_list_item.rich_text);
      if (text) out.push(text);
    } else if (child.type === 'paragraph') {
      // Fallback : si l'utilisateur écrit le callout en paragraphes simples
      const text = plainText(child.paragraph.rich_text);
      if (text) out.push(text);
    }
  }
  if (out.length > 0) return out;

  // Fallback 3 : extraire les lignes du rich_text du callout lui-même.
  if (callout.type !== 'callout') return out;
  const inline = plainText(callout.callout.rich_text);
  if (!inline) return out;
  return inline
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•\-*·–—]+/, '').trim())
    .filter((line) => line.length > 0 && /[:=]/.test(line));
}

// ─── Parsers de valeurs ───

/**
 * Parse une durée en minutes.
 *   "45 min" → 45
 *   "1h"     → 60
 *   "1h30"   → 90
 *   "2 heures" → 120
 *   "90" (pas d'unité) → 90 (assume minutes)
 */
export function parseDuration(raw: string): number | undefined {
  const s = normalize(raw);
  if (!s) return undefined;

  // "1h30", "2h15"
  const hhmm = s.match(/^(\d+)\s*h(?:\s*(\d+))?\b/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = hhmm[2] ? parseInt(hhmm[2], 10) : 0;
    return h * 60 + m;
  }

  // "2 heures", "1 heure"
  const hours = s.match(/(\d+)\s*(?:heure|heures|hour|hours|hr|hrs)\b/);
  if (hours) return parseInt(hours[1], 10) * 60;

  // "45 min", "45 minutes", "45m"
  const minutes = s.match(/(\d+)\s*(?:min|minutes|minute|m)\b/);
  if (minutes) return parseInt(minutes[1], 10);

  // "45" nu → minutes par défaut
  const bare = s.match(/^(\d+)$/);
  if (bare) return parseInt(bare[1], 10);

  return undefined;
}

/**
 * Parse un offset de déverrouillage en jours.
 *   "J+0" / "j+0" → 0
 *   "J+7"         → 7
 *   "immédiat" / "immediate" / "direct" → 0
 *   "7 jours"     → 7
 *   "2026-05-15"  → retourne undefined pour offset (parseUnlockAt gère la date abs)
 */
export function parseUnlockOffset(raw: string): number | undefined {
  const s = normalize(raw);
  if (!s) return undefined;
  if (/^(immediat|immediate|direct|maintenant|now)$/.test(s)) return 0;

  const jPlus = s.match(/^j\s*\+?\s*(\d+)$/);
  if (jPlus) return parseInt(jPlus[1], 10);

  const daysSuffix = s.match(/^(\d+)\s*(?:j|jour|jours|day|days)\b/);
  if (daysSuffix) return parseInt(daysSuffix[1], 10);

  const bare = s.match(/^(\d+)$/);
  if (bare) return parseInt(bare[1], 10);

  return undefined;
}

/** Parse une date ISO absolue pour unlock_at. Retourne undefined si pas une date. */
export function parseUnlockAt(raw: string): string | undefined {
  const s = raw.trim();
  // YYYY-MM-DD ou YYYY-MM-DDTHH:mm...
  if (/^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/.test(s)) return s;
  return undefined;
}

/** Parse le tier d'accès. */
export function parseAccessTier(raw: string): AccessTier | undefined {
  const s = normalize(raw);
  if (s === 'gratuit' || s === 'free') return 'free';
  if (s === 'payant' || s === 'paid') return 'paid';
  if (s === 'apercu' || s === 'preview' || s === 'demo') return 'preview';
  return undefined;
}

/** Parse le type d'un step. */
export function parseStepType(raw: string): StepType | undefined {
  const s = normalize(raw);
  if (s === 'intro' || s === 'introduction') return 'intro';
  if (s === 'etape' || s === 'step') return 'step';
  if (s === 'conclusion' || s === 'fin' || s === 'end') return 'conclusion';
  if (s === 'bonus' || s === 'option' || s === 'optionnel') return 'option';
  return undefined;
}

/** Parse un booléen français/anglais. */
export function parseBool(raw: string): boolean | undefined {
  const s = normalize(raw);
  if (s === 'oui' || s === 'yes' || s === 'true' || s === 'vrai') return true;
  if (s === 'non' || s === 'no' || s === 'false' || s === 'faux') return false;
  return undefined;
}

// ─── Extraction d'une ligne "Clé : valeur" ───

type KeyValue = { key: string; value: string };

/** Extrait { key, value } d'une ligne "Durée : 45 min". Tolérant aux séparateurs ":" et "=". */
function parseKeyValue(line: string): KeyValue | null {
  const m = line.match(/^([^:=]+)[:=]\s*(.+)$/);
  if (!m) return null;
  return { key: normalize(m[1]), value: m[2].trim() };
}

// Synonymes normalisés (sans accents, lowercase) pour chaque concept
const KEY_ALIASES = {
  duration: ['duree', 'durée', 'duration', 'temps'],
  unlock: ['deverrouillage', 'déverrouillage', 'unlock', 'deblocage', 'déblocage', 'ouverture'],
  access: ['acces', 'accès', 'access', 'tier'],
  type: ['type', 'kind'],
  check: [
    'validation requise',
    'validation',
    'requires check',
    'check required',
    'a valider',
    'à valider',
  ],
};

function matchKey(normalizedKey: string, aliases: string[]): boolean {
  const aliasesNormalized = aliases.map(normalize);
  return aliasesNormalized.some((a) => normalizedKey === a || normalizedKey === normalize(a));
}

// ─── Parsers principaux ───

/**
 * Parse un callout ⚙️ Config en UnitConfig.
 * Retourne {} si le callout n'existe pas ou est vide.
 */
export function parseUnitConfig(callout: AugmentedBlock | null | undefined): UnitConfig {
  if (!callout || !isConfigCallout(callout)) return {};
  const lines = extractBullets(callout);
  const config: UnitConfig = {};

  for (const line of lines) {
    const kv = parseKeyValue(line);
    if (!kv) continue;

    if (matchKey(kv.key, KEY_ALIASES.duration)) {
      const n = parseDuration(kv.value);
      if (n !== undefined) config.durationMinutes = n;
    } else if (matchKey(kv.key, KEY_ALIASES.unlock)) {
      // Priorité : date absolue > offset en jours
      const abs = parseUnlockAt(kv.value);
      if (abs) config.unlockAt = abs;
      else {
        const off = parseUnlockOffset(kv.value);
        if (off !== undefined) config.unlockOffsetDays = off;
      }
    } else if (matchKey(kv.key, KEY_ALIASES.access)) {
      const tier = parseAccessTier(kv.value);
      if (tier) config.accessTier = tier;
    }
  }

  return config;
}

/**
 * Parse un callout ⚙️ Config en StepConfig.
 * Retourne {} si le callout n'existe pas ou est vide.
 */
export function parseStepConfig(callout: AugmentedBlock | null | undefined): StepConfig {
  if (!callout || !isConfigCallout(callout)) return {};
  const lines = extractBullets(callout);
  const config: StepConfig = {};

  for (const line of lines) {
    const kv = parseKeyValue(line);
    if (!kv) continue;

    if (matchKey(kv.key, KEY_ALIASES.duration)) {
      const n = parseDuration(kv.value);
      if (n !== undefined) config.durationMinutes = n;
    } else if (matchKey(kv.key, KEY_ALIASES.type)) {
      const t = parseStepType(kv.value);
      if (t) config.type = t;
    } else if (matchKey(kv.key, KEY_ALIASES.check)) {
      const b = parseBool(kv.value);
      if (b !== undefined) config.requiresCheck = b;
    }
  }

  return config;
}

// ─── Extraction de ressources épinglées 📌 ───

// Ré-export du type depuis @/lib/types pour cohérence
export type { PinnedResource } from '@/lib/types';
import type { PinnedResource } from '@/lib/types';

/** Slugify titre → URL-safe : lowercase, sans accents, kebab-case. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/** Extrait l'ID Notion d'une URL (avec ou sans tirets, en fin d'URL). */
function notionIdFromUrl(url: string): string | null {
  const m = url.match(/([0-9a-f]{32})(?:[?#]|$)/i);
  if (m) {
    const raw = m[1];
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  }
  return null;
}

/**
 * Parse tous les callouts 📌 d'une liste de blocks et retourne les ressources.
 *
 * Règle stricte : **un item devient une ressource UNIQUEMENT s'il a un lien**
 * (URL externe ou mention de page Notion). Sinon c'est juste du texte
 * descriptif et on l'ignore.
 *
 * Capture les blocs suivants (récursivement) :
 *   - bullets, to_do, paragraph, toggle, numbered_list_item
 *   - Avec rich_text contenant soit `text.link.url`, soit `href` (mention page)
 *
 * Cas typiques :
 *   ✅ "📄 [Workbook](https://...)" en bullet → ressource avec URL
 *   ✅ "📄 @Découvrir le défi" en bullet ou paragraphe → ressource avec href Notion
 *   ❌ "Pendant 5 jours, tu vas tester..." en paragraphe → ignoré (pas de lien)
 *   ❌ "Apprendre vite. Tester. Voir..." en paragraphe → ignoré
 */
export function parsePinnedResources(blocks: AugmentedBlock[]): PinnedResource[] {
  const out: PinnedResource[] = [];
  const usedSlugs = new Set<string>();

  type RichTextLike = {
    plain_text?: string;
    type?: string;
    text?: { link?: { url?: string } | null };
    mention?: { type?: string; page?: { id?: string }; database?: { id?: string } };
    href?: string | null;
  };

  /** Garantit un slug unique parmi les ressources captées (suffix -2, -3 si collision). */
  function ensureUniqueSlug(base: string): string {
    let candidate = base || 'resource';
    let n = 2;
    while (usedSlugs.has(candidate)) {
      candidate = `${base}-${n++}`;
    }
    usedSlugs.add(candidate);
    return candidate;
  }

  function extractLine(rich: RichTextLike[] | undefined): PinnedResource | null {
    if (!rich || rich.length === 0) return null;
    let externalUrl: string | null = null;
    let mentionPageId: string | null = null;
    let label = '';

    for (const r of rich) {
      label += r.plain_text ?? '';
      // Mention de page Notion → traiter comme interne
      if (r.type === 'mention' && r.mention?.type === 'page' && r.mention.page?.id) {
        if (!mentionPageId) mentionPageId = r.mention.page.id;
      } else if (r.text?.link?.url) {
        // Lien externe inline (markdown link)
        if (!externalUrl) externalUrl = r.text.link.url;
      } else if (r.href && !mentionPageId) {
        // href fallback (peut être une URL Notion → on tente de la convertir en notionId)
        const id = notionIdFromUrl(r.href);
        if (id) mentionPageId = id;
        else if (!externalUrl) externalUrl = r.href;
      }
    }
    label = label.trim();
    if (!label) return null;

    // Priorité : interne (mention page) > externe (URL)
    if (mentionPageId) {
      return {
        label,
        kind: 'internal',
        notionId: mentionPageId,
        slug: ensureUniqueSlug(slugify(label)),
      };
    }
    if (externalUrl) {
      return { label, kind: 'external', url: externalUrl };
    }
    // Pas d'URL ni de mention = texte simple → skip
    return null;
  }

  function visit(block: AugmentedBlock) {
    const t = block.type;

    // Cas spécial : child_page → page Notion imbriquée. Toujours INTERNE (rendue
    // sur la plateforme via /programs/[slug]/r/[slug]).
    if (t === 'child_page') {
      const title = block.child_page?.title?.trim();
      if (title) {
        out.push({
          label: title,
          kind: 'internal',
          notionId: block.id,
          slug: ensureUniqueSlug(slugify(title)),
        });
      }
      return; // pas de récursion dans une child_page
    }

    let rich: RichTextLike[] | undefined;
    if (t === 'bulleted_list_item') rich = block.bulleted_list_item.rich_text;
    else if (t === 'numbered_list_item') rich = block.numbered_list_item.rich_text;
    else if (t === 'paragraph') rich = block.paragraph.rich_text;
    else if (t === 'toggle') rich = block.toggle.rich_text;
    else if (t === 'to_do') rich = block.to_do.rich_text;

    if (rich) {
      const line = extractLine(rich as RichTextLike[]);
      if (line) out.push(line);
    }

    // Récurse sur les __children (cas paragraphe contenant des bullets)
    const subs = (block.__children ?? []) as AugmentedBlock[];
    for (const sub of subs) visit(sub);
  }

  for (const block of blocks) {
    if (!isPinnedCallout(block)) continue;
    const children = (block.__children ?? []) as AugmentedBlock[];
    for (const child of children) visit(child);
  }
  return out;
}
