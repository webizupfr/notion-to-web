import 'server-only';

import { NextResponse } from 'next/server';

import { getPageBundle } from '@/lib/content-store';
import { applyCohortOverlay, getCohortBySlug, nowInTimezone } from '@/lib/cohorts';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hubSlug = (searchParams.get('hub') ?? '').trim();
  const cohortSlug = (searchParams.get('cohort') ?? '').trim();

  if (!hubSlug) {
    return NextResponse.json({ error: 'Missing hub slug (?hub=...)' }, { status: 400 });
  }
  if (!cohortSlug) {
    return NextResponse.json({ error: 'Missing cohort slug (?cohort=...)' }, { status: 400 });
  }

  const bundle = await getPageBundle(hubSlug);
  if (!bundle) {
    return NextResponse.json({ error: 'Hub not found in cache', hub: hubSlug }, { status: 404 });
  }

  const cohort = await getCohortBySlug(cohortSlug);
  if (!cohort) {
    return NextResponse.json({ error: 'Cohort not found', cohort: cohortSlug }, { status: 404 });
  }

  const normalizeId = (value: string) => value.replace(/-/g, '').toLowerCase();
  if (normalizeId(cohort.hubNotionId) !== normalizeId(bundle.meta.notionId)) {
    return NextResponse.json(
      {
        error: 'Cohort does not belong to the requested hub',
        cohortHubId: cohort.hubNotionId,
        hubNotionId: bundle.meta.notionId,
      },
      { status: 400 }
    );
  }

  const overlay = applyCohortOverlay(bundle.meta.learningPath ?? null, cohort);
  const { key: todayKey, iso: todayIso } = nowInTimezone(cohort.timezone);

  return NextResponse.json({
    hub: hubSlug,
    cohort: cohortSlug,
    timezone: cohort.timezone,
    today: { key: todayKey, iso: todayIso },
    learningPath: overlay ?? bundle.meta.learningPath ?? null,
    unitLabels: {
      singular: cohort.unitLabelSingular ?? overlay?.unitLabelSingular ?? bundle.meta.learningPath?.unitLabelSingular ?? null,
      plural: cohort.unitLabelPlural ?? overlay?.unitLabelPlural ?? bundle.meta.learningPath?.unitLabelPlural ?? null,
    },
    scheduleMode: cohort.scheduleMode,
  });
}
