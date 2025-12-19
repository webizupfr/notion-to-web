import 'server-only';

import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { kv } from '@vercel/kv';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function hasCloudinary(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function kvKeyForCloudinary(source: string) {
  return `cloudinary:${crypto.createHash('sha1').update(source).digest('hex')}`;
}

function isLikelySvg(sourceUrl: string, contentType?: string | null | undefined): boolean {
  if (contentType && contentType.toLowerCase().includes('svg')) return true;
  try {
    const u = new URL(sourceUrl);
    if (/\.svg($|(\?.*))/i.test(u.pathname)) return true;
  } catch {
    if (/\.svg($|(\?.*))/i.test(sourceUrl)) return true;
  }
  return false;
}

export type MirrorResult = {
  url: string;
  width?: number;
  height?: number;
  mirrored: boolean;
  fallbackReason?: string;
};

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

export async function mirrorRemoteImage(opts: {
  sourceUrl: string;
  targetKey: string;
  contentTypeHint?: string | null;
}): Promise<MirrorResult> {
  const { sourceUrl, targetKey, contentTypeHint } = opts;

  if (!hasCloudinary()) {
    return { url: sourceUrl, mirrored: false, fallbackReason: 'cloudinary-disabled' };
  }

  const cacheKey = kvKeyForCloudinary(`${targetKey}:${sourceUrl}`);

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
    console.error('KV read cloudinary cache failed', error);
  }

  let response: Response;
  try {
    response = await fetch(sourceUrl);
  } catch (error) {
    console.warn('Cloudinary mirror fetch failed', { sourceUrl, error });
    return { url: sourceUrl, mirrored: false, fallbackReason: 'fetch-failed' };
  }

  if (!response.ok) {
    console.warn('Cloudinary mirror fetch returned non-ok', { sourceUrl, status: response.status });
    return { url: sourceUrl, mirrored: false, fallbackReason: `status-${response.status}` };
  }

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    console.warn('Cloudinary mirror arrayBuffer failed', { sourceUrl, error });
    return { url: sourceUrl, mirrored: false, fallbackReason: 'arraybuffer-failed' };
  }

  const contentType = response.headers.get('content-type') ?? contentTypeHint ?? undefined;
  const svgAsset = isLikelySvg(sourceUrl, contentType);
  const payloadMime = svgAsset ? 'image/svg+xml' : (contentType || 'image/jpeg');

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
    // Upload to Cloudinary
    const uploadOptions: Parameters<typeof cloudinary.uploader.upload>[1] = {
      public_id: targetKey,
      folder: 'notion-pages',
      resource_type: svgAsset ? 'image' : 'auto',
      overwrite: true,
      invalidate: true,
    };
    if (svgAsset) {
      uploadOptions.format = 'svg';
    } else {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
      uploadOptions.flags = 'progressive';
    }

    const result = await cloudinary.uploader.upload(
      `data:${payloadMime};base64,${Buffer.from(arrayBuffer).toString('base64')}`,
      uploadOptions
    );

    const cloudinaryUrl = result.secure_url;
    const finalWidth = result.width || width;
    const finalHeight = result.height || height;

    try {
      await kv.set(cacheKey, { url: cloudinaryUrl, width: finalWidth, height: finalHeight });
    } catch (error) {
      console.error('KV write cloudinary cache failed', error);
    }

    console.log(`[cloudinary] ✅ Uploaded image: ${targetKey} -> ${cloudinaryUrl}`);
    return { url: cloudinaryUrl, width: finalWidth, height: finalHeight, mirrored: true };
  } catch (error) {
    console.warn('Cloudinary mirror upload failed', { sourceUrl, targetKey, error });
    return { url: sourceUrl, width, height, mirrored: false, fallbackReason: 'upload-failed' };
  }
}
