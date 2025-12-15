import Image from "next/image";
import Link from "next/link";

import { Heading } from "@/components/ui/Heading";
import { Text } from "@/components/ui/Text";

export type PostCardData = {
  slug: string;
  title: string;
  excerpt?: string | null;
  cover?: string | null; // URL absolue (Notion file/external)
};

export function PostCard({ post }: { post: PostCardData }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block overflow-hidden rounded-2xl border border-white/40 bg-white/50 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400"
      aria-label={post.title}
    >
      {/* Cover */}
      <div className="relative aspect-[16/9] bg-slate-100">
        {post.cover ? (
          <Image
            src={post.cover}
            alt={post.title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            priority={false}
          />
        ) : null}
      </div>

      {/* Texte */}
      <div className="p-5">
        <Heading level={2} className="text-[1.15rem] leading-[1.35] text-slate-900">
          {post.title}
        </Heading>
        {post.excerpt ? (
          <Text className="mt-2 text-[0.95rem] leading-[1.65] text-slate-600 line-clamp-3">
            {post.excerpt}
          </Text>
        ) : null}

        <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-slate-700">
          Lire <span aria-hidden className="text-base">→</span>
        </span>
      </div>
    </Link>
  );
}
