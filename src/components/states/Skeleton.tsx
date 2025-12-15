export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[var(--r-s)] bg-[color-mix(in_srgb,var(--fg-soft)_12%,var(--bg-card)_88%)] ${className}`}
    />
  );
}
