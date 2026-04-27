import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import "@/styles/hub.css";

import { getProgramTree } from "@/lib/programs";
import { resolveInstructors } from "@/lib/instructors";
import { auth } from "@/auth";
import { isEnrolled, getEnrollment, getProgramProgress } from "@/lib/db/progress";
import type { NotionBlock } from "@/lib/notion";
import { buildDayEntriesFromProgram, unitLabelsFor } from "@/lib/program-nav";

import { PageSection } from "@/components/layout/PageSection";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { Blocks } from "@/components/notion/Blocks";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import StartToday from "@/components/learning/StartToday";
import { EnrollButton } from "@/components/lms/EnrollButton";
import { PaywallCard } from "@/components/lms/PaywallCard";
import { ProgramResources } from "@/components/lms/ProgramResources";
import { ProgressBar } from "@/components/lms/ProgressBar";
import { CompletionToast } from "@/components/lms/CompletionToast";

export const revalidate = 0;

export default async function ProgramPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string>>;
}) {
  const { slug } = await params;
  const tree = await getProgramTree(slug);
  if (!tree) return notFound();
  const { meta, units } = tree;

  // Gate draft → 404 sauf admin
  if (meta.publishingStatus === 'draft') {
    const session = await auth();
    if (session?.user?.role !== 'admin') return notFound();
  }

  // Gate private → /gate si pas cookie
  if (meta.visibility === 'private' && meta.password) {
    const sp = (await searchParams?.catch(() => undefined)) || undefined;
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = (sp?.key ?? sp?.token) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = meta.password.trim();
    if (!key) redirect(`/gate?next=/programs/${slug}`);
    if (password && key !== password) redirect(`/gate?next=/programs/${slug}&e=1`);
  }

  // LMS enrichment
  const instructors = await resolveInstructors(meta.instructorIds);
  const sessionAuth = await auth();

  let userEnrolled = false;
  let enrolledAt: Date | null = null;
  let completedUnitIds = new Set<string>();
  if (sessionAuth?.user?.id) {
    userEnrolled = await isEnrolled({
      userId: sessionAuth.user.id,
      programType: meta.type,
      programSlug: slug,
    });
    if (userEnrolled) {
      const [enrollment, progressRows] = await Promise.all([
        getEnrollment({
          userId: sessionAuth.user.id,
          programType: meta.type,
          programSlug: slug,
        }),
        getProgramProgress({
          userId: sessionAuth.user.id,
          programType: meta.type,
          programSlug: slug,
        }),
      ]);
      enrolledAt = enrollment?.startedAt ?? enrollment?.enrolledAt ?? null;
      completedUnitIds = new Set(
        progressRows.filter((p) => p.status === 'completed').map((p) => p.activityNotionId),
      );
    }
  }

  // Body blocks viennent directement du tree (déjà filtrés : pas de child_page, pas de 📌)
  const sections = splitBlocksIntoSections(tree.bodyBlocks as NotionBlock[]);

  const basePath = `programs/${slug}`;
  // On ne passe PLUS les units en "navigation" (elles sont déjà dans releasedDays → "Jours disponibles")
  // pour éviter le doublon. navigation[] reste vide, l'utilisateur voit une seule liste de units propre.
  const days = buildDayEntriesFromProgram({ tree, enrolledAt, basePath, completedUnitIds });
  const labels = unitLabelsFor(meta.type);
  const completedCount = completedUnitIds.size;
  const totalUnits = units.length;
  const progressPct = totalUnits > 0 ? Math.round((completedCount / totalUnits) * 100) : 0;

  // En mode "modules" (sync/event), la sidebar utilise moduleQuickGroups.
  const moduleQuickGroups =
    labels.kind === 'modules'
      ? [
          {
            label: labels.plural,
            items: units.map(({ meta: u }) => ({
              id: u.notionId,
              title: u.title,
              slug: `${basePath}/${u.slug}`,
              order: u.order,
            })),
          },
        ]
      : undefined;

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10">
      <CompletionToast />
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={meta.title}
          parentSlug={basePath}
          parentIcon={null}
          navigation={[]}
          isHub
          hubDescription={meta.description ?? null}
          releasedDays={days}
          learningKind={labels.kind}
          unitLabelSingular={labels.singular}
          unitLabelPlural={labels.plural}
          moduleQuickGroups={moduleQuickGroups}
          actionsSlot={<ProgramResources resources={tree.pinnedResources} programSlug={slug} />}
          fullHeight
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={meta.title}
          parentSlug={basePath}
          parentIcon={null}
          navigation={[]}
          isHub
          hubDescription={meta.description ?? null}
          releasedDays={days}
          learningKind={labels.kind}
          unitLabelSingular={labels.singular}
          unitLabelPlural={labels.plural}
          moduleQuickGroups={moduleQuickGroups}
          actionsSlot={<ProgramResources resources={tree.pinnedResources} programSlug={slug} />}
          fullHeight
        />
      </div>

      <section className="flex-1 min-w-0 hub-content">
        {/* Admin draft banner */}
        {meta.publishingStatus === 'draft' && sessionAuth?.user?.role === 'admin' ? (
          <PageSection variant="content" size="wide" paddingY="tight">
            <div
              role="alert"
              className="rounded-[var(--r-m)] border border-[color:var(--accent)] bg-[color:var(--accent-bg)] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--accent-edge)]"
            >
              [admin] · Programme en DRAFT — non visible publiquement
            </div>
          </PageSection>
        ) : null}

        {/* Hero */}
        <PageSection variant="content" size="wide">
          <header
            className="relative overflow-hidden rounded-[var(--r-xl)] px-[var(--space-lg)] py-[var(--space-xl)]"
            style={
              meta.coverImageUrl
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.70), rgba(15,23,42,0.92)), url(${meta.coverImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: 'white',
                  }
                : undefined
            }
          >
            {/* Badge prix flottant si programme payant */}
            {meta.price && meta.price > 0 ? (
              <span
                className="absolute right-[var(--space-md)] top-[var(--space-md)] inline-flex items-center gap-1 rounded-full border border-[color:var(--accent-edge)] px-[var(--space-sm)] py-1.5 font-mono text-[12px] font-semibold tracking-tight text-[color:var(--accent-ink)] shadow-md"
                style={{ background: 'var(--accent)' }}
              >
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: meta.currency ?? 'EUR',
                  maximumFractionDigits: meta.price % 1 === 0 ? 0 : 2,
                }).format(meta.price)}
              </span>
            ) : null}

            <div className="space-y-[var(--space-md)]">
              <span
                className="eyebrow-pill"
                style={meta.coverImageUrl ? { background: 'rgba(255,255,255,0.12)', color: 'white' } : undefined}
              >
                <span className="eyebrow-pill__dot" aria-hidden />
                Programme · {meta.type}
                {units.length ? ` · ${units.length} ${labels.plural.toLowerCase()}` : ""}
                {meta.price && meta.price > 0 ? ' · payant' : ''}
              </span>
              <Heading level={1} className={meta.coverImageUrl ? 'text-white' : undefined}>
                {meta.title}
              </Heading>
              {meta.description ? (
                <Text
                  variant="lead"
                  className={
                    meta.coverImageUrl
                      ? 'max-w-[62ch] text-white/90'
                      : 'max-w-[62ch] text-[color:var(--text-secondary)]'
                  }
                >
                  {meta.description}
                </Text>
              ) : null}
            </div>
          </header>
        </PageSection>

        {/* Enrollment CTA / enrolled banner */}
        {!userEnrolled ? (
          meta.price && meta.price > 0 ? (
            // Programme PAYANT non-acheté → PaywallCard pro
            <PageSection variant="content" size="wide" paddingY="tight">
              <div className="mx-auto max-w-[520px]">
                <PaywallCard
                  programType={meta.type}
                  programSlug={slug}
                  price={meta.price}
                  currency={meta.currency ?? 'EUR'}
                  unitsCount={units.length}
                  unitLabelPlural={labels.plural}
                  certificateEnabled={meta.certificateEnabled}
                  instructors={instructors}
                  requireLogin={!sessionAuth?.user}
                />
              </div>
            </PageSection>
          ) : (
            // Programme GRATUIT non-inscrit → CTA simple
            <PageSection variant="content" size="wide" paddingY="tight">
              <div className="flex flex-col items-center gap-[var(--space-sm)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 py-[var(--space-md)]">
                {meta.certificateEnabled ? (
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)]">
                    🏅 Certificat délivré à la fin du programme
                  </span>
                ) : null}
                {instructors.length > 0 ? (
                  <span className="text-[0.9rem] text-[color:var(--text-secondary)]">
                    Avec {instructors.map((i) => i.name).join(', ')}
                  </span>
                ) : null}
                <EnrollButton
                  programType={meta.type}
                  programSlug={slug}
                  alreadyEnrolled={false}
                  requireLogin={!sessionAuth?.user}
                  nextHref={`/programs/${slug}`}
                  price={null}
                  labelEnroll="Démarrer maintenant"
                />
              </div>
            </PageSection>
          )
        ) : userEnrolled ? (
          <PageSection variant="content" size="wide" paddingY="tight">
            <div className="flex flex-col gap-[var(--space-sm)] rounded-[var(--r-m)] border border-[color:var(--border-subtle)] bg-[color:var(--surface-1)] px-4 py-[var(--space-md)]">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 text-[0.9rem] text-[color:var(--text-secondary)]">
                  <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--signal-success)]" />
                  {progressPct === 100
                    ? 'Programme terminé 🎉'
                    : 'Tu es inscrit.e à ce programme'}
                </span>
                <Link
                  href="/my-learning"
                  className="font-mono text-[11px] uppercase tracking-[0.1em] text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
                >
                  Mon espace →
                </Link>
              </div>
              {totalUnits > 0 ? (
                <ProgressBar
                  completed={completedCount}
                  total={totalUnits}
                  unitLabelPlural={labels.plural}
                />
              ) : null}
              {progressPct === 100 && meta.certificateEnabled ? (
                <a
                  href={`/api/certificates/${slug}`}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-primary mt-[var(--space-xs)] self-start"
                  style={{ height: 36, padding: '0 14px', fontSize: 13 }}
                >
                  🏅 Télécharger mon certificat
                </a>
              ) : null}
            </div>
          </PageSection>
        ) : null}

        {/* Welcome content — Notion body blocks du programme */}
        {sections.length
          ? sections.map((section, idx) => {
              const tone = idx % 2 === 0 ? "default" : "alt";
              return (
                <PageSection
                  key={section.id}
                  variant="content"
                  tone={tone}
                  size="wide"
                >
                  <div className="content-panel section-band w-full">
                    <Blocks blocks={section.blocks} currentSlug={basePath} navigation={[]} />
                  </div>
                </PageSection>
              );
            })
          : null}

        {/* StartToday — next available unit (uniquement si inscrit) */}
        {userEnrolled && days.length ? (
          <PageSection variant="content" size="wide">
            <StartToday days={days} unitLabelSingular={labels.singular} />
          </PageSection>
        ) : null}
      </section>
    </div>
  );
}
