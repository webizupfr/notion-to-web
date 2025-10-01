import { Blocks } from "@/components/notion/Blocks";
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
  const slug = slugSegments.join("/");  const bundle = await unstable_cache(
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

  const wrapperClass = meta.fullWidth
    ? "mx-auto flex w-full max-w-[1800px] flex-col gap-12"
    : "mx-auto flex w-full max-w-4xl flex-col gap-12";

  return (
    <section className={wrapperClass}>
      <Blocks blocks={blocks} currentSlug={slug} />
    </section>
  );
}
