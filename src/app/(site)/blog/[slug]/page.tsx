import { Blocks } from "@/components/notion/Blocks";
import { PageSection } from "@/components/layout/PageSection";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { getPageBundle, getPostsIndex } from "@/lib/content-store";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function PostPage({ params }: { params: Promise<{ slug: string }> | { slug: string } }) {
  const { slug } = await (params as Promise<{ slug: string }>);
  const bundle = await unstable_cache(
    async () => await getPageBundle(slug),
    [`page-bundle:${slug}`],
    { tags: [`page:${slug}`], revalidate: 60 }
  )();
  if (!bundle) return notFound();

  const { blocks, meta } = bundle;

  if (!blocks?.length) {
    return notFound();
  }

  const postsIndex = await unstable_cache(
    async () => await getPostsIndex(),
    ["posts-index"],
    { tags: ["posts:index"], revalidate: 60 }
  )();
  const indexEntry = postsIndex?.items.find((item) => item.slug === slug);
  const excerpt = indexEntry?.excerpt ?? null;

  return (
    <PageSection variant="blog">
      <article className="space-y-8 max-w-[72ch]">
        <header className="space-y-4">
          <span className="pill">Journal · Article</span>
          <Heading level={1}>{meta.title}</Heading>
          {excerpt ? <Text variant="lead">{excerpt}</Text> : null}
        </header>

        <Blocks blocks={blocks} currentSlug={`blog/${slug}`} />
      </article>
    </PageSection>
  );
}
