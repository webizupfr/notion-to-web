import type { ReactNode } from "react";
import { IconInfo, IconCheckCircle, IconAlertTriangle, IconOctagon, IconListChecks, IconChevronRight } from "@/components/ui/icons";
import type { LayoutVariant } from "@/components/notion/callout-layout";

type Variant = "info" | "success" | "warning" | "danger" | "neutral" | "grey" | "exercise" | "connector";

// Harmonized base + subtle interior variation per tone (radial tint using accent)
const variantStyles: Record<Variant, { bg: string; border: string; accent: string; overlay?: string | null; fallbackIcon: ReactNode | null; label: string }> = {
  info: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 92%,#fff))",
    border: "color-mix(in oklab, var(--border) 70%, transparent)",
    accent: "var(--accent)",
    overlay: "color-mix(in oklab, var(--accent) 12%, transparent)",
    fallbackIcon: <IconInfo size={18} />,
    label: "IA générative",
  },
  exercise: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 92%,#fff))",
    border: "color-mix(in oklab, var(--border) 70%, transparent)",
    accent: "var(--accent)",
    overlay: "color-mix(in oklab, var(--accent) 12%, transparent)",
    fallbackIcon: <IconListChecks size={18} />,
    label: "",
  },
  success: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 92%,#fff))",
    border: "color-mix(in oklab, var(--border) 70%, transparent)",
    accent: "var(--success)",
    overlay: "color-mix(in oklab, var(--success) 12%, transparent)",
    fallbackIcon: <IconCheckCircle size={18} />,
    label: "Action",
  },
  warning: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 92%,#fff))",
    border: "color-mix(in oklab, var(--border) 70%, transparent)",
    accent: "var(--warning)",
    overlay: "color-mix(in oklab, var(--warning) 12%, transparent)",
    fallbackIcon: <IconAlertTriangle size={18} />,
    label: "",
  },
  danger: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 92%,#fff))",
    border: "color-mix(in oklab, var(--border) 70%, transparent)",
    accent: "var(--danger)",
    overlay: "color-mix(in oklab, var(--danger) 12%, transparent)",
    fallbackIcon: <IconOctagon size={18} />,
    label: "Important",
  },
  neutral: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 94%,#fff))",
    border: "color-mix(in oklab, var(--border) 80%, transparent)",
    accent: "var(--muted)",
    overlay: "color-mix(in oklab, var(--muted) 10%, transparent)",
    fallbackIcon: null,
    label: "Note",
  },
  grey: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 94%,#fff))",
    border: "color-mix(in oklab, var(--border) 80%, transparent)",
    accent: "var(--muted)",
    overlay: "color-mix(in oklab, var(--muted) 12%, transparent)",
    fallbackIcon: null,
    label: "",
  },
  connector: {
    bg: "linear-gradient(180deg,#fff,color-mix(in oklab,var(--bg) 92%,#fff))",
    border: "color-mix(in oklab, var(--border) 70%, transparent)",
    accent: "color-mix(in oklab, var(--accent) 80%, #7a5a3c)",
    overlay: "color-mix(in oklab, var(--accent) 10%, transparent)",
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
  layoutVariant?: LayoutVariant;
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
  layoutVariant = 'note',
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
  const label = labelOverride === undefined ? defaults.label : labelOverride;
  const displayIcon = showIcon ? (icon ?? styles.fallbackIcon) : null;

  // Variant-aware paddings and elevation
  const basePadding = density === 'compact' ? 'py-3 px-4' : 'py-4 px-5';
  const padding = variant === 'grey' ? 'py-3 px-4' : variant === 'neutral' ? 'py-3 px-4' : basePadding;
  const borderStyle = resolvedFrame === 'dotted' ? 'dotted' : 'solid';
  const borderWidth = resolvedFrame === 'none' ? '0px' : '1px';
  const elevationClass = 'shadow-none';

  const backgroundCss = styles.overlay
    ? (variant === 'neutral' || variant === 'grey'
        ? `radial-gradient(680px 280px at 12% -10%, ${styles.overlay}, transparent 62%), ${bg}`
        : `radial-gradient(700px 260px at 10% -10%, ${styles.overlay}, transparent 58%), ${bg}`)
    : bg;

  const layoutConfig: Record<LayoutVariant, { barWidth: number; className?: string }> = {
    note: { barWidth: resolvedBar ? 3 : 0 },
    timeline: { barWidth: resolvedBar ? 4 : 0 },
    exercise: { barWidth: resolvedBar ? 4 : 0, className: "info-card--exercise" },
    sectionHeader: { barWidth: 0, className: "info-card--hero" },
    result: { barWidth: resolvedBar ? 4 : 0, className: "info-card--result" },
    ai: { barWidth: resolvedBar ? 4 : 0, className: "info-card--ai" },
    theory: { barWidth: resolvedBar ? 3 : 0, className: "info-card--theory" },
    story: { barWidth: resolvedBar ? 3 : 0, className: "info-card--story" },
    warning: { barWidth: resolvedBar ? 4 : 0, className: "info-card--warning" },
  };

  const config = layoutConfig[layoutVariant] ?? layoutConfig.note;

  return (
    <div
      className={`info-card relative overflow-hidden rounded-[var(--r-md)] ${elevationClass} ${padding} ${config.className ?? ""}`}
      data-variant={variant}
      data-layout={layoutVariant}
      style={{
        background: backgroundCss,
        border: `${borderWidth} ${borderStyle} ${variant === 'neutral' || variant === 'grey' ? styles.border : `color-mix(in oklab, ${styles.accent} 20%, var(--border-soft))`}`,
      }}
    >
      {headerBand ? (
        <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: styles.accent }} />
      ) : null}
      {resolvedBar ? (
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0" style={{ width: config.barWidth, backgroundColor: styles.accent }} />
      ) : null}
      <div className="flex flex-col gap-3 text-[0.98rem] leading-[1.6] text-[color:var(--fg)]/78">
        {(label || title || displayIcon) ? (
          <div className="info-card-header flex items-center gap-2">
            {displayIcon ? <span className="info-card-icon text-base flex-shrink-0 text-[var(--foreground)]" aria-hidden>{displayIcon}</span> : null}
            {label ? (
              <span className="info-card-label inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--fg)]/70 border border-[color:var(--border)] bg-white/70">
                {label}
              </span>
            ) : null}
            {title ? (
              <span className="info-card-title text-[0.98rem] font-semibold text-[color:var(--fg)] leading-tight">{title}</span>
            ) : null}
          </div>
        ) : null}
        <div className="info-card-body">{children}</div>
      </div>
      {cta ? (
        <div className="info-card-footer mt-3 flex justify-end">
          <a href={cta.href} className="btn btn-ghost btn-sm">{cta.label}</a>
        </div>
      ) : null}
    </div>
  );
}
