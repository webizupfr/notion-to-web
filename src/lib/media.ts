import 'server-only';

import crypto from 'node:crypto';

import { kv } from '@vercel/kv';
import { put } from '@vercel/blob';
// Optional dependency: image-size. We resolve it at runtime only if present
type ImageSizeFn = (input: Buffer) => { width?: number; height?: number };
function tryResolveImageSize(): ImageSizeFn | null {
  try {
    // avoid static analysis by bundlers
    const req: NodeRequire = (0, eval)('require');
    const mod = req('image-size');
    const fn: ImageSizeFn = (mod.imageSize ?? mod) as ImageSizeFn;
    if (typeof fn === 'function') return fn;
    return null;
  } catch {
    return null;
  }
}

function hasBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function kvKeyForBlob(source: string) {
  return `blob:${crypto.createHash('sha1').update(source).digest('hex')}`;
}

export type MirrorResult = {
  url: string;
  width?: number;
  height?: number;
  mirrored: boolean;
  fallbackReason?: string;
};

export async function mirrorRemoteImage(opts: {
  sourceUrl: string;
  targetKey: string;
  contentTypeHint?: string | null;
}): Promise<MirrorResult> {
  const { sourceUrl, targetKey, contentTypeHint } = opts;

  if (!hasBlob()) {
    return { url: sourceUrl, mirrored: false, fallbackReason: 'blob-disabled' };
  }

  const cacheKey = kvKeyForBlob(`${targetKey}:${sourceUrl}`);

  try {
    const cached = await kv.get<unknown>(cacheKey);
    if (cached) {
      if (typeof cached === 'string') return { url: cached, mirrored: true };
      if (typeof cached === 'object' && cached && 'url' in (cached as Record<string, unknown>)) {
        const obj = cached as { url: string; width?: number; height?: number };
        return { ...obj, mirrored: true };
      }
    }
  } catch (error) {
    console.error('KV read blob cache failed', error);
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    console.warn('Blob mirror fetch failed', { sourceUrl, error });
    return { url: sourceUrl, mirrored: false, fallbackReason: 'fetch-failed' };
  }

  if (!response.ok) {
    console.warn('Blob mirror fetch returned non-ok', { sourceUrl, status: response.status });
    return { url: sourceUrl, mirrored: false, fallbackReason: `status-${response.status}` };
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    console.warn('Blob mirror arrayBuffer failed', { sourceUrl, error });
    return { url: sourceUrl, mirrored: false, fallbackReason: 'arraybuffer-failed' };
  }

  const contentType = response.headers.get('content-type') ?? contentTypeHint ?? undefined;

  // Extract intrinsic dimensions
  let width: number | undefined;
  let height: number | undefined;
  const sizeFn = tryResolveImageSize();
  if (sizeFn) {
    try {
      const dim = sizeFn(Buffer.from(arrayBuffer));
      width = dim?.width ?? undefined;
      height = dim?.height ?? undefined;
    } catch {
      // ignore sizing errors
    }
  }

  try {
    const { url } = await put(targetKey, Buffer.from(arrayBuffer), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
    });

    try {
      await kv.set(cacheKey, { url, width, height });
    } catch (error) {
      console.error('KV write blob cache failed', error);
    }

    return { url, width, height, mirrored: true };
  } catch (error) {
    console.warn('Blob mirror upload failed', { sourceUrl, targetKey, error });
    return { url: sourceUrl, width, height, mirrored: false, fallbackReason: 'upload-failed' };
  }
}
