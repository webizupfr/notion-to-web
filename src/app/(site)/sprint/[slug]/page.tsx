import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import "@/styles/sprint.css";

import { getSprintBundle } from "@/lib/content-store";
import type { NotionBlock } from "@/lib/notion";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { Blocks } from "@/components/notion/Blocks";
import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

export const revalidate = 0;

function formatDurationMinutes(mins: number | null | undefined): string | null {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function timeUntil(dateIso: string | null | undefined): string | null {
  if (!dateIso) return null;
  const target = new Date(dateIso).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);
  const mins = Math.round(diff / 60000);
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `dans ${h} h ${m} min`;
  if (h > 0) return `dans ${h} h`;
  return `dans ${m} min`;
}

export default async function SprintPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug } = await (params as Promise<{ slug: string }>);

  const bundle = await unstable_cache(
    async () => await getSprintBundle(slug),
    ["sprint-bundle:" + slug],
    { tags: ["page:sprint:" + slug], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if (bundle.visibility === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore: Awaited<ReturnType<typeof cookies>> = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = bundle.password?.trim() ?? "";
    if (!key) redirect(`/gate?next=/sprint/${slug}`);
    if (password && key !== password) redirect(`/gate?next=/sprint/${slug}&e=1`);
  }

  const timezone = bundle.timezone || "Europe/Paris";

  const contextBlocks = bundle.contextBlocks ?? [];
  const sprintTitle = bundle.title;
  const sprintSubtitle = bundle.description ?? null;
  const contextLabel =
    ((bundle.settings as { context?: string | null } | null | undefined)?.context ?? "").trim() || null;
  const navSlug = `sprint/${slug}`;
  const modules = bundle.modules.map((module, index) => {
    const number = module.order > 0 ? module.order : index + 1;
    const dayLabel =
      typeof module.dayIndex === "number" && !Number.isNaN(module.dayIndex)
        ? `Jour ${module.dayIndex + 1}`
        : `Module ${number}`;
    return {
      ...module,
      number,
      dayLabel,
      href: `/sprint/${slug}/${module.slug}`,
    };
  });

  const totalDurationMinutes = modules.reduce((acc, mod) => acc + (mod.duration ?? 0), 0);
  const totalDurationLabel = formatDurationMinutes(totalDurationMinutes);
  const metaItems = [
    totalDurationLabel,
    `${bundle.modules.length} module${bundle.modules.length > 1 ? "s" : ""}`,
    contextLabel,
  ].filter(Boolean);
  const navigation = modules.map((mod) => ({
    type: "page" as const,
    title: mod.title,
    slug: `sprint/${slug}/${mod.slug}`,
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={sprintTitle}
          parentSlug={`sprint/${slug}`}
          navigation={navigation}
          learningKind="modules"
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={sprintTitle}
          parentSlug={`sprint/${slug}`}
          navigation={navigation}
          learningKind="modules"
        />
      </div>

      <section className="flex-1 min-w-0 sprint-content">
        <PageSection variant="content" size="wide" paddingY="tight">
          <div className="surface-card space-y-[var(--space-m)]">
            <header className="flex flex-col gap-[var(--space-s)] sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-[var(--space-xs)]">
                <div className="flex items-center gap-[var(--space-s)]">
                  <span className="pill">Sprint / Hackathon</span>
                  {timezone ? (
                    <span className="rounded-full border border-[color:var(--border)] px-[var(--space-3)] py-[var(--space-1)] text-[0.95rem] text-[color:var(--muted)]">
                      {timezone}
                    </span>
                  ) : null}
                </div>
                <Heading level={1}>{sprintTitle}</Heading>
                {sprintSubtitle ? (
                  <Text variant="lead" className="max-w-[72ch]">
                    {sprintSubtitle}
                  </Text>
                ) : null}
                {metaItems.length ? (
                  <Text variant="small" className="text-[color:var(--muted)]">
                    {metaItems.join(" · ")}
                  </Text>
                ) : null}
              </div>
              <div className="flex items-center gap-[var(--space-s)]">
                <div className="rounded-full border border-[color:var(--border)] bg-[color-mix(in_srgb,var(--bg)_96%,white_4%)] px-[var(--space-4)] py-[var(--space-2)] text-[0.95rem] font-semibold text-[color:var(--fg)] shadow-[var(--shadow-subtle)]">
                  {bundle.modules.length} module{bundle.modules.length > 1 ? "s" : ""}
                </div>
              </div>
            </header>
          </div>
        </PageSection>

        <PageSection variant="content" id="modules" size="wide" paddingY="tight">
          <div className="space-y-[var(--space-m)]">
            <Heading level={2}>Modules du sprint</Heading>
            <div className="grid gap-[var(--space-m)] sm:grid-cols-2">
              {modules.map((module) => {
                const countdown = timeUntil(module.unlockAtISO);
                const locked = module.isLocked;
                const moduleSubtitle = (module as { subtitle?: string | null }).subtitle ?? module.description ?? null;
                const moduleDuration = formatDurationMinutes(module.duration);
                const moduleLevel = module.tags?.[0] ?? null;
                const stateLabel = locked ? (countdown ? `Verrouillé (${countdown})` : "Verrouillé") : "Accessible";
                return (
                  <Link
                    key={module.slug}
                    href={module.href}
                    className={`surface-card block transition-transform hover:-translate-y-[1px] ${locked ? "opacity-75" : ""}`}
                    data-state={locked ? "locked" : "unlocked"}
                  >
                    <Text variant="small" className="uppercase tracking-[0.12em] text-[color:var(--muted)]">
                      {module.dayLabel}
                    </Text>
                    <Heading level={3} className="mt-[var(--space-xs)]">
                      {module.title}
                    </Heading>
                    {moduleSubtitle ? (
                      <Text className="mt-[var(--space-xs)] text-[color:var(--muted)]">{moduleSubtitle}</Text>
                    ) : null}
                    <Text
                      variant="small"
                      className="mt-[var(--space-s)] text-[color:var(--muted)]"
                    >
                      {stateLabel}
                      {moduleDuration ? ` · ${moduleDuration}` : ""}
                      {moduleLevel ? ` · ${moduleLevel}` : ""}
                    </Text>
                  </Link>
                );
              })}
            </div>
          </div>
        </PageSection>

        <PageSection variant="content" size="wide" paddingY="tight">
          <div className="space-y-[var(--space-s)]">
            <Heading level={2}>Sprint Innovation : le Hub</Heading>
            {sprintSubtitle ? <Text>{sprintSubtitle}</Text> : null}
            {contextLabel ? <Text className="text-[color:var(--muted)]">{contextLabel}</Text> : null}
            <div className="flex flex-wrap gap-[var(--space-s)] pt-[var(--space-s)]">
              <Link href="/contact" className="btn btn-primary">
                Planifier un échange
              </Link>
              <Link href="#modules" className="btn btn-secondary">
                Voir les modules
              </Link>
            </div>
          </div>
        </PageSection>

        {contextBlocks?.length ? (() => {
          const sections = splitBlocksIntoSections(contextBlocks as NotionBlock[]);
          if (sections.length <= 1) {
            return (
              <PageSection variant="content" size="wide" paddingY="tight">
                <div className="content-panel section-band w-full">
                  <Blocks blocks={contextBlocks} currentSlug={navSlug} />
                </div>
              </PageSection>
            );
          }
          return (
            <>
              {sections.map((section, idx) => {
                const tone = idx % 2 === 0 ? "default" : "alt";
                return (
                  <PageSection
                    key={section.id}
                    variant="content"
                    tone={tone}
                    size="wide"
                    paddingY="tight"
                  >
                    <div className="content-panel section-band w-full">
                      <Blocks blocks={section.blocks} currentSlug={navSlug} />
                    </div>
                  </PageSection>
                );
              })}
            </>
          );
        })() : null}
      </section>
    </div>
  );
}
