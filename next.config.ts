import type { NextConfig } from "next";

// SEO gate — noindex par défaut, ouverture via SEO_NOINDEX=0
const noindex = (process.env.SEO_NOINDEX ?? "1") !== "0";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Notion sources
      { protocol: "https", hostname: "prod-files-secure.s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "secure.notion-static.com" },
      { protocol: "https", hostname: "static.notion-static.com" },
      { protocol: "https", hostname: "www.notion.so" },
      { protocol: "https", hostname: "notion.so" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Cloudinary CDN
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 600,
    dangerouslyAllowSVG: true,
  },
  async headers() {
    if (!noindex) return [];
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive",
          },
        ],
      },
    ];
  },
  // Legacy /hubs/** et /sprint/** → /programs/**
  // (unification Programs V2 — cf. src/lib/programs.ts)
  async redirects() {
    return [
      { source: "/hubs", destination: "/programs", permanent: true },
      { source: "/hubs/:slug", destination: "/programs/:slug", permanent: true },
      { source: "/hubs/:slug/:daySlug", destination: "/programs/:slug/:daySlug", permanent: true },
      // Les pages cohort sont dépréciées — on redirige vers le programme sans cohort
      { source: "/hubs/:slug/c/:cohort", destination: "/programs/:slug", permanent: false },
      { source: "/hubs/:slug/c/:cohort/:daySlug", destination: "/programs/:slug/:daySlug", permanent: false },
      { source: "/sprint", destination: "/programs", permanent: true },
      { source: "/sprint/:slug", destination: "/programs/:slug", permanent: true },
      { source: "/sprint/:slug/:moduleSlug", destination: "/programs/:slug/:moduleSlug", permanent: true },
    ];
  },
};

export default nextConfig;
