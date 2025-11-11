// components/notion/LinkCard.tsx
import Link from 'next/link'
export function LinkCard({ href, title, meta }: { href:string; title:string; meta?:string }) {
  return (
    <Link href={href} className="ui-card block bg-white p-4">
      <div className="font-semibold text-slate-900">{title}</div>
      {meta && <div className="mt-1 text-sm text-slate-600">{meta}</div>}
    </Link>
  )
}
