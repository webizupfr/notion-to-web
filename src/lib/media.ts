import 'server-only';

// Migration Cloudinary: on délègue le mirroring à lib/cloudinary
import { mirrorRemoteImage as cloudinaryMirror } from './cloudinary';

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
