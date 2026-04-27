/**
 * Helpers pour transformer les URLs Cloudinary côté delivery.
 *
 * Une URL Cloudinary a la forme :
 *   https://res.cloudinary.com/{cloud}/image/upload/{transforms?}/{path}
 *
 * On insère des transforms juste après `/upload/` :
 *   - `f_auto`   → format auto (WebP/AVIF si supporté, JPG sinon)
 *   - `q_auto`   → qualité adaptive
 *   - `w_X`      → redimensionnement à largeur X (px)
 *   - `c_limit`  → ne grandit pas au-delà de la taille source
 *   - `dpr_auto` → adapte au density ratio du device (retina)
 *
 * Pour les URLs non-Cloudinary, on retourne l'URL telle quelle.
 */

const CLOUDINARY_HOST = 'res.cloudinary.com';

function isCloudinaryUrl(url: string): boolean {
  return url.includes(CLOUDINARY_HOST) && url.includes('/upload/');
}

/**
 * Génère une URL Cloudinary optimisée pour une thumbnail (card).
 * @param url - URL source (Cloudinary ou autre)
 * @param width - largeur cible en px (default: 800)
 * @returns URL transformée (ou identique si non-Cloudinary)
 */
export function cloudinaryThumb(url: string | null | undefined, width = 800): string {
  if (!url) return '';
  if (!isCloudinaryUrl(url)) return url;

  const transforms = `f_auto,q_auto,w_${width},c_limit,dpr_auto`;
  return url.replace('/upload/', `/upload/${transforms}/`);
}

/**
 * Variante pour images "hero" (plus larges).
 */
export function cloudinaryHero(url: string | null | undefined, width = 1600): string {
  return cloudinaryThumb(url, width);
}
