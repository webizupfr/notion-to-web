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
      : "text-[color:#2b1b00] border border-[color-mix(in_oklab,var(--primary)_70%,#f59f0b)] shadow-[0_10px_20px_rgba(245,158,11,0.25)] bg-[linear-gradient(120deg,color-mix(in_oklab,var(--primary)_85%,#fff4c2),color-mix(in_oklab,var(--primary)_97%,#facc15))] hover:shadow-[0_14px_28px_rgba(245,158,11,0.32)] hover:brightness-105";

  return (
    <a href={href} rel="noreferrer" className={cx(base, tone, className)}>
      {label}
    </a>
  );
}
