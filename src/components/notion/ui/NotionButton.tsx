type Props = {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
  className?: string;
};

export function NotionButton({ href, label, variant = "primary", className }: Props) {
  const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");
  const base =
    "notion-button inline-flex items-center justify-center gap-2 rounded-[var(--r-lg)] px-[var(--space-5)] py-[var(--space-3)] text-[1rem] font-semibold transition";
  const tone =
    variant === "ghost"
      ? "border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)] text-[var(--fg)] hover:bg-[color-mix(in_oklab,var(--bg)_90%,#fff)]"
      : "bg-[var(--fg)] text-[var(--bg)] shadow-[var(--shadow-subtle)] hover:opacity-90";

  return (
    <a href={href} rel="noreferrer" className={cx(base, tone, className)}>
      {label}
    </a>
  );
}
