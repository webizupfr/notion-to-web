'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

/**
 * Charts client (recharts) pour /admin/analytics.
 *
 * Toutes les data sont déjà agrégées côté serveur (lib/admin/analytics.ts) —
 * ces composants reçoivent juste des arrays prêts à plot.
 *
 * Couleurs : jaune accent + neutres pour rester cohérent avec le brand.
 */

const ACCENT = '#F9D656'; // jaune Impulsion (matche --accent en hex)
const ACCENT_DARK = '#D4B53D';
const INK = '#0F1724';
const MUTED = '#94A3B8';
const LINE = '#E2E4E8';

const tooltipStyle = {
  backgroundColor: 'white',
  border: `1px solid ${LINE}`,
  borderRadius: 6,
  fontSize: 12,
  padding: '6px 10px',
};

// ─── Inscriptions dans le temps (line) ─────────────────────────────────────

type EnrollmentPoint = { date: string; count: number };

export function EnrollmentsOverTimeChart({ data }: { data: EnrollmentPoint[] }) {
  if (!data.length) return <EmptyState label="Aucune inscription sur la période." />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          stroke={MUTED}
          fontSize={11}
          tickFormatter={(v) => v.slice(5)} /* MM-DD */
        />
        <YAxis stroke={MUTED} fontSize={11} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: INK, fontWeight: 600 }} />
        <Line
          type="monotone"
          dataKey="count"
          stroke={ACCENT_DARK}
          strokeWidth={2}
          dot={{ fill: ACCENT, r: 3 }}
          activeDot={{ r: 5 }}
          name="Inscriptions"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Revenus par mois (bar) ────────────────────────────────────────────────

type RevenuePoint = { month: string; revenueCents: number; count: number };

export function RevenuePerMonthChart({ data }: { data: RevenuePoint[] }) {
  if (!data.length) return <EmptyState label="Aucun revenu sur la période." />;
  const transformed = data.map((d) => ({
    month: d.month.slice(2), // YY-MM
    revenue: Math.round(d.revenueCents / 100),
    count: d.count,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={transformed} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="month" stroke={MUTED} fontSize={11} />
        <YAxis
          stroke={MUTED}
          fontSize={11}
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: INK, fontWeight: 600 }}
          formatter={(value) => [`${Number(value)} €`, 'Revenue']}
        />
        <Bar dataKey="revenue" fill={ACCENT} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Top programmes (bar horizontal) ───────────────────────────────────────

type ProgramRanking = {
  programSlug: string;
  enrollments: number;
  completed: number;
  revenueCents: number;
};

export function TopProgramsChart({ data }: { data: ProgramRanking[] }) {
  if (!data.length) return <EmptyState label="Aucun enrollment encore." />;
  const transformed = data.map((d) => ({
    name: d.programSlug,
    enrollments: d.enrollments,
    completed: d.completed,
  }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, transformed.length * 36)}>
      <BarChart
        data={transformed}
        layout="vertical"
        margin={{ top: 12, right: 24, left: 0, bottom: 8 }}
      >
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" stroke={MUTED} fontSize={11} allowDecimals={false} />
        <YAxis
          dataKey="name"
          type="category"
          stroke={MUTED}
          fontSize={11}
          width={140}
          tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
        />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: INK, fontWeight: 600 }} />
        <Bar dataKey="enrollments" fill={ACCENT} radius={[0, 4, 4, 0]} name="Inscriptions" />
        <Bar dataKey="completed" fill={ACCENT_DARK} radius={[0, 4, 4, 0]} name="Complétés" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Dropoff par unit (bar) ────────────────────────────────────────────────

type DropoffPoint = {
  /** Label affiché (ex: "Jour 1 — Découvrir") */
  label: string;
  /** Order (pour tri) */
  order: number;
  completed: number;
  /** % par rapport à la 1ère unit */
  retentionPct: number;
};

export function DropoffChart({ data }: { data: DropoffPoint[] }) {
  if (!data.length)
    return <EmptyState label="Aucune complétion sur ce programme encore." />;
  const sorted = [...data].sort((a, b) => a.order - b.order);
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sorted} margin={{ top: 12, right: 12, left: 0, bottom: 40 }}>
        <CartesianGrid stroke={LINE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          stroke={MUTED}
          fontSize={10}
          interval={0}
          angle={-30}
          textAnchor="end"
          height={70}
          tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)}
        />
        <YAxis stroke={MUTED} fontSize={11} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: INK, fontWeight: 600 }}
          formatter={(value, name) => [
            Number(value),
            String(name) === 'completed' ? 'Complétés' : String(name),
          ]}
        />
        <Bar dataKey="completed" radius={[4, 4, 0, 0]}>
          {sorted.map((d, idx) => {
            // Couleur dégradée jaune→orange selon le retention %
            const opacity = Math.max(0.3, d.retentionPct / 100);
            return <Cell key={idx} fill={ACCENT} fillOpacity={opacity} />;
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Empty state commun ────────────────────────────────────────────────────

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center rounded-[var(--r-s)] border border-dashed border-[color:var(--border-subtle)] bg-[color:var(--surface-1)]">
      <p className="text-[0.85rem] text-[color:var(--text-tertiary)]">{label}</p>
    </div>
  );
}
