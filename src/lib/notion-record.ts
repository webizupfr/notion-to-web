import 'server-only';

import { NotionAPI } from 'notion-client';
import type { ExtendedRecordMap } from 'notion-types';

const USE_RECORDMAP = process.env.USE_RECORDMAP;
const NOTION_RECORDMAP_SHARE = process.env.NOTION_RECORDMAP_SHARE || 'public';

function isEnabled() {
  return USE_RECORDMAP === '1' || USE_RECORDMAP === 'true';
}

let cachedApi: NotionAPI | null = null;

function getApi() {
  if (cachedApi) return cachedApi;
  if (!isEnabled()) return null;

  const auth = NOTION_RECORDMAP_SHARE === 'private' ? process.env.NOTION_TOKEN_V2 : undefined;
  if (NOTION_RECORDMAP_SHARE === 'private' && !auth) {
    console.warn('[recordMap] NOTION_TOKEN_V2 missing while private mode requested.');
    return null;
  }

  const options = auth ? { authToken: auth } : {};
  cachedApi = new NotionAPI(options);
  return cachedApi;
}

export async function fetchRecordMap(pageId: string): Promise<ExtendedRecordMap | null> {
  const api = getApi();
  if (!api) return null;

  try {
    const recordMap = await api.getPage(pageId);
    return recordMap as ExtendedRecordMap;
  } catch (error) {
    console.warn('[recordMap] fetch failed for', pageId, error);
    return null;
  }
}
