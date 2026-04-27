import { IconSparkles } from '@/components/ui/icons';
import { cloudinaryThumb } from '@/lib/cloudinary-url';

/**
 * Thumb visuel d'un programme. Si l'URL est fournie → image cover.
 * Sinon → fallback élégant : gradient subtle + initiale + icône.
 *
 * Utilisé dans : cards /programs, /my-learning, landing.
 *
 * Optimisations images :
 *   - Cloudinary : w_800,f_auto,q_auto,c_limit,dpr_auto (≈ 50-100kB en WebP/AVIF
 *     vs ~500kB en JPG full size). Voir lib/cloudinary-url.ts.
 *   - <img loading="lazy"> par défaut pour les cards hors viewport.
 *   - <img decoding="async"> pour ne pas bloquer le main thread.
 *
 * Dimensions recommandées des images source : 1600x1000 (16:10).
 */
export function ProgramCardThumb({
  src,
  title,
  className = '',
  ratio = '16/10',
  priority = false,
}: {
  src?: string | null;
  title: string;
  className?: string;
  ratio?: '16/10' | '16/9' | '4/3' | '1/1';
  /** Hint pour le LCP : passe `true` sur la 1re card visible (au-dessus du fold). */
  priority?: boolean;
}) {
  if (src) {
    const optimizedSrc = cloudinaryThumb(src, 800);
    return (
      <div
        className={`w-full overflow-hidden ${className}`}
        style={{ aspectRatio: ratio }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={optimizedSrc}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          className="h-full w-full object-cover"
          aria-hidden
        />
      </div>
    );
  }

  // Fallback : gradient pastel + initiale du titre + sparkle
  const initial = (title.trim()[0] ?? '?').toUpperCase();

  return (
    <div
      className={`relative w-full overflow-hidden ${className}`}
      style={{
        aspectRatio: ratio,
        backgroundImage:
          'linear-gradient(135deg, color-mix(in oklab, var(--accent) 25%, var(--surface-2)) 0%, var(--surface-2) 60%, color-mix(in oklab, var(--accent-edge) 18%, var(--surface-2)) 100%)',
      }}
      aria-hidden
    >
      <span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-[family-name:var(--font-display)] font-bold leading-none text-[color:var(--text-primary)]/15 select-none"
        style={{ fontSize: 'clamp(72px, 12vw, 144px)' }}
      >
        {initial}
      </span>
      <IconSparkles
        size={20}
        className="absolute right-3 bottom-3 text-[color:var(--accent-edge)] opacity-50"
        strokeWidth={1.5}
      />
    </div>
  );
}
