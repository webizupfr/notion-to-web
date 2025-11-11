import type { ReactNode } from "react";
import { IconInfo, IconCheckCircle, IconAlertTriangle, IconOctagon, IconListChecks, IconChevronRight } from "@/components/ui/icons";

type Variant = "info" | "success" | "warning" | "danger" | "neutral" | "grey" | "exercise" | "connector";

// Harmonized base + subtle interior variation per tone (radial tint using accent)
const variantStyles: Record<Variant, { bg: string; border: string; accent: string; overlay?: string | null; fallbackIcon: ReactNode | null; label: string }> = {
  info: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#3B82F6",
    overlay: "rgba(59,130,246,0.08)",
    fallbackIcon: <IconInfo size={18} />,
    label: "IA générative",
  },
  exercise: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#F97316",
    overlay: "rgba(249,115,22,0.08)",
    fallbackIcon: <IconListChecks size={18} />,
    label: "",
  },
  success: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#10B981",
    overlay: "rgba(16,185,129,0.08)",
    fallbackIcon: <IconCheckCircle size={18} />,
    label: "Action",
  },
  warning: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#F59E0B",
    overlay: "rgba(245,158,11,0.08)",
    fallbackIcon: <IconAlertTriangle size={18} />,
    label: "",
  },
  danger: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#EF4444",
    overlay: "rgba(239,68,68,0.08)",
    fallbackIcon: <IconOctagon size={18} />,
    label: "Important",
  },
  neutral: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#94A3B8",
    overlay: "rgba(246,201,120,0.09)",
    fallbackIcon: null,
    label: "Note",
  },
  grey: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#94A3B8",
    overlay: "rgba(148,163,184,0.09)",
    fallbackIcon: null,
    label: "",
  },
  connector: {
    bg: "linear-gradient(180deg,#fff,var(--surface))",
    border: "var(--border-soft)",
    accent: "#9A6B4F",
    overlay: "rgba(154,107,79,0.06)",
    fallbackIcon: <IconChevronRight size={16} />,
    label: "",
  },
};

export function resolveCalloutVariant(tone?: string | null): Variant {
  const t = (tone ?? "").toLowerCase();
  if (t.includes("gray")) return "grey";
  if (t.includes("brown")) return "connector";
  if (t.includes("orange")) return "exercise";
  if (t.includes("green")) return "success";
  if (t.includes("yellow")) return "warning";
  if (t.includes("red") || t.includes("pink")) return "danger";
  if (t.includes("blue") || t.includes("purple")) return "info";
  return "neutral";
}

type InfoCardProps = {
  variant?: Variant;
  icon?: ReactNode | null;
  title?: ReactNode;
  labelOverride?: string | null;
  frame?: 'none' | 'solid' | 'dotted';
  density?: 'compact' | 'comfy';
  accentBar?: boolean;
  bgColorOverride?: string | null;
  headerBand?: boolean;
  cta?: { label: string; href: string } | null;
  children: ReactNode;
};

export function InfoCard({
  variant = 'neutral',
  icon,
  title,
  labelOverride,
  frame,
  density = 'comfy',
  accentBar,
  bgColorOverride,
  headerBand,
  cta,
  children,
}: InfoCardProps) {
  const styles = variantStyles[variant];

  // Defaults per variant
  const defaults: { frame: 'none'|'solid'|'dotted'; accentBar: boolean; showIcon: boolean; bg: string; border: string; label: string|null } =
    variant === 'neutral' || variant === 'grey'
      ? { frame: 'none', accentBar: false, showIcon: false, bg: styles.bg, border: styles.border, label: null }
      : variant === 'connector'
      ? { frame: 'none', accentBar: true, showIcon: false, bg: styles.bg, border: styles.border, label: null }
      : { frame: 'none', accentBar: true, showIcon: false, bg: styles.bg, border: styles.border, label: styles.label };

  const resolvedFrame = frame ?? defaults.frame;
  const resolvedBar = accentBar ?? defaults.accentBar;
  const showIcon = (icon === null) ? false : (icon ? true : defaults.showIcon);
  const bg = bgColorOverride ?? defaults.bg;
  const borderColor = defaults.border;
  const label = labelOverride === undefined ? defaults.label : labelOverride;
  const displayIcon = showIcon ? (icon ?? styles.fallbackIcon) : null;

  // Variant-aware paddings and elevation
  const basePadding = density === 'compact' ? 'py-3 px-5' : 'py-5 px-6';
  const padding = variant === 'grey' ? 'py-2.5 px-4' : variant === 'neutral' ? 'py-3 px-5' : basePadding;
  const borderStyle = 'solid';
  const borderWidth = '1px';
  const elevationClass = 'shadow-none';

  const backgroundCss = styles.overlay
    ? (variant === 'neutral' || variant === 'grey'
        ? `radial-gradient(750px 320px at 10% -10%, ${styles.overlay}, transparent 64%), radial-gradient(650px 260px at 95% 110%, ${styles.overlay}, transparent 58%), ${bg}`
        : `radial-gradient(700px 300px at 10% -10%, ${styles.overlay}, transparent 64%), ${bg}`)
    : bg;

  return (
    <div
      className={`info-card relative overflow-hidden rounded-[22px] ${elevationClass} ${padding}`}
      data-variant={variant}
      style={{
        background: backgroundCss,
        border: `${borderWidth} ${borderStyle} ${variant === 'neutral' || variant === 'grey' ? styles.border : `color-mix(in oklab, ${styles.accent} 20%, var(--border-soft))`}`,
      }}
    >
      {headerBand ? (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: styles.accent }} />
      ) : null}
      {resolvedBar ? (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-1" style={{ backgroundColor: styles.accent }} />
      ) : null}
      <div className="flex items-start gap-3 text-[0.98rem] leading-[1.6] text-slate-700">
        {displayIcon ? <span className="text-xl flex-shrink-0" aria-hidden>{displayIcon}</span> : null}
        <div className="space-y-2 flex-1 min-w-0 w-full">
          {title ? (
            <div className="font-semibold text-slate-900">{title}</div>
          ) : label ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
          ) : null}
          <div>{children}</div>
        </div>
      </div>
      {cta ? (
        <div className="mt-3 flex justify-end">
          <a href={cta.href} className="btn btn-ghost btn-sm">{cta.label}</a>
        </div>
      ) : null}
    </div>
  );
}
