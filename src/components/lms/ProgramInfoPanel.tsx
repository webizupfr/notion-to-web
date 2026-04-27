import type { InstructorMeta } from '@/lib/types';

type Props = {
  /** Sections textuelles (hub ou sprint peut pas toutes en avoir) */
  targetAudience?: string | null;
  prerequisites?: string | null;
  learningOutcomes?: string | null;
  estimatedDurationMinutes?: number | null;
  certificateEnabled?: boolean | null;
  capacity?: number | null;
  instructors?: InstructorMeta[];
};

/**
 * Panel structuré qui affiche les champs enrichis Tier 1 sur une page
 * hub ou sprint : durée, pour qui, prérequis, objectifs, instructeurs,
 * certificat, capacité. Rend rien si tout est vide.
 */
export function ProgramInfoPanel({
  targetAudience,
  prerequisites,
  learningOutcomes,
  estimatedDurationMinutes,
  certificateEnabled,
  capacity,
  instructors = [],
}: Props) {
  const hasAnything =
    targetAudience ||
    prerequisites ||
    learningOutcomes ||
    estimatedDurationMinutes ||
    capacity ||
    certificateEnabled ||
    (instructors && instructors.length > 0);

  if (!hasAnything) return null;

  const durationHours = estimatedDurationMinutes
    ? Math.round(estimatedDurationMinutes / 60)
    : null;

  return (
    <section className="my-[var(--space-xl)] rounded-[var(--r-l)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] p-[var(--space-lg)]">
      {/* Meta row : durée / capacité / certificat */}
      {(durationHours || capacity || certificateEnabled) && (
        <div className="flex flex-wrap items-center gap-[var(--space-md)] border-b border-[color:var(--border-subtle)] pb-[var(--space-md)]">
          {durationHours && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                Durée
              </span>
              <span className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold text-[color:var(--text-primary)]">
                ~{durationHours}h
              </span>
            </div>
          )}
          {capacity && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                Capacité
              </span>
              <span className="font-[family-name:var(--font-display)] text-[1.05rem] font-semibold text-[color:var(--text-primary)]">
                {capacity} places
              </span>
            </div>
          )}
          {certificateEnabled && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
                Certificat
              </span>
              <span className="font-[family-name:var(--font-display)] text-[0.95rem] text-[color:var(--text-primary)]">
                ✓ délivré
              </span>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-[var(--space-lg)] pt-[var(--space-md)] sm:grid-cols-2">
        {targetAudience && (
          <Section title="Pour qui" body={targetAudience} />
        )}
        {prerequisites && (
          <Section title="Prérequis" body={prerequisites} />
        )}
        {learningOutcomes && (
          <Section title="À la fin, tu sauras" body={learningOutcomes} wide />
        )}
      </div>

      {instructors && instructors.length > 0 && (
        <div className="mt-[var(--space-lg)] border-t border-[color:var(--border-subtle)] pt-[var(--space-md)]">
          <p className="mb-[var(--space-sm)] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
            Animé par
          </p>
          <div className="flex flex-wrap gap-[var(--space-md)]">
            {instructors.map((i) => (
              <InstructorCard key={i.id} instructor={i} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Section({
  title,
  body,
  wide = false,
}: {
  title: string;
  body: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : ''}>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--text-tertiary)]">
        {title}
      </p>
      <div className="whitespace-pre-line text-[0.95rem] leading-[1.55] text-[color:var(--text-primary)]">
        {body}
      </div>
    </div>
  );
}

function InstructorCard({ instructor }: { instructor: InstructorMeta }) {
  return (
    <div className="flex items-center gap-3">
      {instructor.photoUrl ? (
        <div
          className="h-10 w-10 shrink-0 rounded-full bg-[color:var(--surface-2)] bg-cover bg-center"
          style={{ backgroundImage: `url(${instructor.photoUrl})` }}
          aria-hidden
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-bg)] font-[family-name:var(--font-display)] text-sm font-semibold text-[color:var(--accent-edge)]">
          {instructor.name.slice(0, 1).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="font-[family-name:var(--font-display)] text-[0.95rem] font-semibold tracking-tight text-[color:var(--text-primary)]">
          {instructor.name}
        </p>
        {instructor.role && (
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
            {instructor.role}
          </p>
        )}
      </div>
    </div>
  );
}
