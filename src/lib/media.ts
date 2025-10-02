import 'server-only';

import crypto from 'node:crypto';

import { kv } from '@vercel/kv';
// Vercel Blob supprimé - migration vers Cloudinary
import { mirrorRemoteImage as cloudinaryMirror } from './cloudinary';
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
  // Désactivé - migration vers Cloudinary
  return false;
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
  // Délégation vers Cloudinary
  return cloudinaryMirror(opts);
}
