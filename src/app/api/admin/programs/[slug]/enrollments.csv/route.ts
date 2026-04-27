import 'server-only';

import { NextResponse } from 'next/server';

import { requireAdminApi } from '@/lib/admin/api-guard';
import { getEnrollmentsForExport } from '@/lib/admin/analytics';

/**
 * Export CSV des enrollments d'un programme.
 *
 *   GET /api/admin/programs/[slug]/enrollments.csv
 *
 * Renvoie un text/csv prêt à être téléchargé. Utile pour relancer en masse
 * (mailing externe), tracker des KPIs sur Excel, etc.
 *
 * Auth : admin only (cookie session NextAuth).
 */

export const runtime = 'nodejs';

const HEADERS = [
  'email',
  'name',
  'program_slug',
  'program_type',
  'cohort_slug',
  'enrolled_at',
  'started_at',
  'completed_at',
  'last_activity_at',
];

/** Échappe une valeur pour CSV : quotes si contient virgule, quote, ou newline. */
function csvEscape(value: string | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { slug } = await params;

  let rows;
  try {
    rows = await getEnrollmentsForExport(slug);
  } catch (e) {
    return NextResponse.json(
      { error: 'export_failed', message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  // Build CSV
  const lines = [HEADERS.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.email),
        csvEscape(r.name),
        csvEscape(r.programSlug),
        csvEscape(r.programType),
        csvEscape(r.cohortSlug),
        csvEscape(r.enrolledAt),
        csvEscape(r.startedAt),
        csvEscape(r.completedAt),
        csvEscape(r.lastActivityAt),
      ].join(','),
    );
  }
  const csv = lines.join('\n');

  // BOM pour qu'Excel détecte UTF-8 correctement (sinon les accents sautent)
  const body = '\uFEFF' + csv;
  const filename = `enrollments-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
