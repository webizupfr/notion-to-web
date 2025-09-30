import { Blocks } from "@/components/notion/Blocks";
import { Container } from "@/components/layout/Container";
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
    <Container className="space-y-12 max-w-3xl">
      <article className="space-y-8">
        <header className="space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--background-soft)] px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted-soft)]">
            Journal · Article
          </span>
          <h1 className="text-[2.3rem] font-semibold leading-[1.2] tracking-[-0.02em]">{meta.title}</h1>
          {excerpt && (
            <p className="text-[1.05rem] leading-[1.7] text-[var(--muted-soft)]">{excerpt}</p>
          )}
        </header>

        <div className="surface-card px-0 pb-0 pt-0">
          <div className="space-y-5 px-6 pb-8 pt-8 sm:px-8">
            <Blocks blocks={blocks} />
          </div>
        </div>
      </article>
    </Container>
  );
}
