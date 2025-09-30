// components/notion/LinkCard.tsx
import Link from 'next/link'
export function LinkCard({ href, title, meta }: { href:string; title:string; meta?:string }) {
  return (
    <Link href={href} className="block rounded-2xl border/40 border p-4 hover:bg-white/5 transition">
      <div className="font-semibold">{title}</div>
      {meta && <div className="text-sm opacity-70 mt-1">{meta}</div>}
    </Link>
  )
}
