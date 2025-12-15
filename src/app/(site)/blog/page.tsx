import { Container } from "@/components/layout/Container";
import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";
import { getPostsIndex } from "@/lib/content-store";
import { unstable_cache } from "next/cache";
import { PostCard } from "./PostCard";

export const revalidate = 0;

export default async function BlogIndex() {
  const postsIndex = await unstable_cache(
    async () => await getPostsIndex(),
    ["posts-index"],
    { tags: ["posts:index"], revalidate: 60 }
  )();

  const posts = (postsIndex?.items ?? []).slice(0, 50);

  return (
    <Container className="space-y-12 py-12">
      {/* En-tête */}
      <section className="space-y-5 max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/50 backdrop-blur px-4 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
          Journal
        </span>
        <div className="space-y-3">
          <Heading level={1} className="text-[2.3rem] leading-[1.2] tracking-[-0.02em] text-slate-900">
            Explorations et retours d’expérience
          </Heading>
          <Text className="max-w-2xl text-[1.05rem] leading-[1.7] text-slate-600">
            Veille, études de cas et méthodes pour passer d’une idée à une preuve avec l’IA et le design.
          </Text>
        </div>
      </section>

      {/* Grille de cartes */}
      <div className="grid gap-6 md:grid-cols-2">
        {posts.map((post) => (
          <PostCard
            key={post.slug}
            post={{
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt ?? null,
              cover: post.cover ?? null,
            }}
          />
        ))}
      </div>

      {/* Vide */}
      {posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300/60 bg-white/40 backdrop-blur px-8 py-12 text-center text-sm text-slate-500">
          Aucun article pour le moment.<br />
          Synchronisez vos contenus Notion pour les voir apparaître ici.
        </div>
      )}
    </Container>
  );
}
