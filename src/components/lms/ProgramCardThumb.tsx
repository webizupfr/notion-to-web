import { IconSparkles } from '@/components/ui/icons';

/**
 * Thumb visuel d'un programme. Si l'URL est fournie → image cover.
 * Sinon → fallback élégant : gradient subtle + initiale + icône.
 *
 * Utilisé dans : cards /programs, /my-learning, landing.
 *
 * Dimensions recommandées des images : 1600x1000 (16:10).
 */
export function ProgramCardThumb({
  src,
  title,
  className = '',
  ratio = '16/10',
}: {
  src?: string | null;
  title: string;
  className?: string;
  ratio?: '16/10' | '16/9' | '4/3' | '1/1';
}) {
  if (src) {
    return (
      <div
        className={`w-full bg-cover bg-center ${className}`}
        style={{ backgroundImage: `url(${src})`, aspectRatio: ratio }}
        aria-hidden
      />
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
