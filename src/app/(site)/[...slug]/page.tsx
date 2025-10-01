import { Blocks } from "@/components/notion/Blocks";
import { PageSidebar } from "@/components/layout/PageSidebar";
import { getPageBundle } from "@/lib/content-store";
import { unstable_cache } from "next/cache";
import { notFound, redirect } from "next/navigation";

export const revalidate = 0;

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string[] }> | { slug: string[] };
  searchParams?: Promise<Record<string, string>> | Record<string, string>;
}) {
  const resolvedParams = await (params as Promise<{ slug: string[] }>);
  const slugSegments = Array.isArray(resolvedParams.slug) ? resolvedParams.slug : [resolvedParams.slug];
  const slug = slugSegments.join("/");
  
  const bundle = await unstable_cache(
    async () => await getPageBundle(slug),
    [`page-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 }
  )();
  
  if (!bundle) return notFound();

  const { meta, blocks } = bundle;

  const isPrivate = meta.visibility === "private";

  if (isPrivate) {
    const sp = (await (searchParams as Promise<Record<string, string>>).catch(() => undefined)) || (searchParams as Record<string, string> | undefined);
    const key = (sp?.key ?? sp?.token) as string | undefined;
    if (!key) redirect(`/gate?next=/${slug}`);
    if (meta.password && key !== meta.password) redirect(`/gate?next=/${slug}&e=1`);
  }

  if (!blocks?.length) {
    return notFound();
  }

  // Déterminer si on affiche avec sidebar
  // Cas 1: Page parent avec navigation
  const hasNavigation = meta.navigation && meta.navigation.length > 0;
  const isParentWithNav = meta.fullWidth && hasNavigation;
  
  // Cas 2: Child page avec info du parent
  const isChildWithParent = meta.parentSlug && meta.parentNavigation;
  
  const showSidebar = isParentWithNav || isChildWithParent;

  if (showSidebar) {
    // Déterminer quelle navigation et quel parent afficher
    const navTitle = isChildWithParent ? meta.parentTitle! : meta.title;
    const navSlug = isChildWithParent ? meta.parentSlug! : slug;
    const navigation = isChildWithParent ? meta.parentNavigation! : meta.navigation!;
    
    // Layout avec sidebar pour pages full-width avec navigation
    return (
      <div className="mx-auto flex w-full max-w-[1800px] gap-12">
        {/* Sidebar gauche */}
        <PageSidebar
          parentTitle={navTitle}
          parentSlug={navSlug}
          navigation={navigation}
        />
        
        {/* Contenu principal */}
        <section className="flex-1 min-w-0">
          <Blocks blocks={blocks} currentSlug={slug} />
        </section>
      </div>
    );
  }

  // Layout classique (avec ou sans full-width)
  const wrapperClass = meta.fullWidth
    ? "mx-auto flex w-full max-w-[1800px] flex-col gap-12"
    : "mx-auto flex w-full max-w-4xl flex-col gap-12";

  return (
    <section className={wrapperClass}>
      <Blocks blocks={blocks} currentSlug={slug} />
    </section>
  );
}
