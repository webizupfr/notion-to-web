import { notFound, redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { cookies } from "next/headers";
import "@/styles/hub.css";

import { getPageBundle } from "@/lib/content-store";
import type { NotionBlock } from "@/lib/notion";
import { PageSection } from "@/components/layout/PageSection";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { splitBlocksIntoSections } from "@/components/learning/sectioning";
import { Blocks } from "@/components/notion/Blocks";
import StartToday from "@/components/learning/StartToday";

export const revalidate = 0;

export default async function HubPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }> | { slug: string };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const { slug } = await (params as Promise<{ slug: string }>);
  const bundle = await unstable_cache(
    async () => await getPageBundle(slug),
    [`hub-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 }
  )();

  if (!bundle) return notFound();

  if ((bundle.meta.visibility ?? "public") === "private") {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const cookieStore = await cookies();
    const cookieKey = cookieStore.get("gate_key")?.value;
    const rawKey = ((sp?.key ?? sp?.token) as string | undefined) || cookieKey;
    const key = rawKey?.trim() ?? "";
    const password = (bundle.meta.password ?? "").trim();
    if (!key) redirect(`/gate?next=/hubs/${slug}`);
    if (password && key !== password) redirect(`/gate?next=/hubs/${slug}&e=1`);
  }

  const navigation = (bundle.meta.navigation ?? []) as NonNullable<typeof bundle.meta.navigation>;
  const learningPath = bundle.meta.learningPath ?? null;
  const unitLabelSingular = learningPath?.unitLabelSingular;
  const days = (learningPath?.days ?? []) as import("@/lib/types").DayEntry[];
  const basePath = `hubs/${slug}`;

  const removePinnedCallouts = (blocksList: NotionBlock[]): NotionBlock[] => {
    return blocksList.filter((block) => {
      if ((block as { type?: string }).type !== "callout") return true;
      const callout = (block as Extract<NotionBlock, { type: "callout" }>).callout;
      const text = (callout.rich_text ?? [])
        .map((r) => r.plain_text ?? "")
        .join("")
        .trim();
      const icon = callout.icon;
      const hasPinIcon = icon?.type === "emoji" && icon.emoji === "📌";
      const hasPinText = text.startsWith("📌");
      return !(hasPinIcon || hasPinText);
    });
  };

  const sections = splitBlocksIntoSections(removePinnedCallouts((bundle.blocks ?? []) as NotionBlock[]));
  const renderSections = () => {
    if (!sections.length) return null;
    if (sections.length === 1) {
      return (
        <PageSection variant="content" size="wide">
          <div className="content-panel section-band w-full">
            <Blocks blocks={sections[0].blocks} currentSlug={`hubs/${slug}`} />
          </div>
        </PageSection>
      );
    }
    return sections.map((section, idx) => {
      const tone = idx % 2 === 0 ? "default" : "alt";
      return (
        <PageSection
          key={section.id}
          variant="content"
          tone={tone}
          size="wide"
        >
          <div className="content-panel section-band w-full">
            <Blocks blocks={section.blocks} currentSlug={`hubs/${slug}`} />
          </div>
        </PageSection>
      );
    });
  };

  const stripLeadingSlash = (value: string) => value.replace(/^\/+/, "");
  const ensureHubScopedSlug = (value: string | undefined | null) => {
    const raw = stripLeadingSlash(value ?? "");
    if (!raw) return "";
    if (raw.startsWith("hubs/")) return raw.replace(/\/+/g, "/");
    if (raw === slug) return basePath;
    if (raw.startsWith(`${slug}/`)) {
      const suffix = raw.slice(slug.length + 1);
      return `${basePath}/${suffix}`.replace(/\/+/g, "/");
    }
    if (!raw.includes("/")) {
      return `${basePath}/${raw}`.replace(/\/+/g, "/");
    }
    return raw.replace(/\/+/g, "/");
  };
  const withPrefix = (s: string | undefined | null) => {
    const scoped = ensureHubScopedSlug(s);
    return scoped ? scoped : "";
  };

  const navItems = navigation.map((item) => {
    if (item.type === "section" && item.children) {
      return {
        ...item,
        children: item.children.map((child) => ({ ...child, slug: withPrefix(child.slug) })),
      };
    }
    if (item.type === "page") {
      return { ...item, slug: withPrefix((item as { slug?: string }).slug) };
    }
    return item;
  });

  const daysWithPrefix = days.map((day) => ({
    ...day,
    slug: withPrefix(day.slug),
  }));

  return (
    <div className="mx-auto flex w-full max-w-[1800px] gap-10">
      <div className="hidden lg:block lg:flex-shrink-0">
        <PageSidebar
          parentTitle={bundle.meta.title}
          parentSlug={basePath}
          parentIcon={bundle.meta.icon ?? null}
          navigation={navItems}
          isHub
          hubDescription={bundle.meta.description ?? null}
          releasedDays={daysWithPrefix}
          learningKind={learningPath?.kind}
          unitLabelSingular={unitLabelSingular}
          unitLabelPlural={learningPath?.unitLabelPlural}
        />
      </div>

      <div className="lg:hidden">
        <PageSidebar
          parentTitle={bundle.meta.title}
          parentSlug={basePath}
          parentIcon={bundle.meta.icon ?? null}
          navigation={navItems}
          isHub
          hubDescription={bundle.meta.description ?? null}
          releasedDays={daysWithPrefix}
          learningKind={learningPath?.kind}
          unitLabelSingular={unitLabelSingular}
          unitLabelPlural={learningPath?.unitLabelPlural}
        />
      </div>

      <section className="flex-1 min-w-0 hub-content">
        {renderSections()}

        {days.length ? (
          <PageSection variant="content" size="wide">
              <StartToday days={daysWithPrefix} unitLabelSingular={unitLabelSingular} />
          </PageSection>
        ) : null}
      </section>
    </div>
  );
}
