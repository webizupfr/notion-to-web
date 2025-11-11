import type { ReactNode } from "react";

type PullQuoteProps = {
  children: ReactNode;
  author?: ReactNode;
};

export function PullQuote({ children, author }: PullQuoteProps) {
  return (
    <figure className="my-1 border-l-4 border-amber-300/80 bg-amber-50/50 px-3 py-0.5 text-[1rem] text-slate-800">
      <blockquote
        className="m-0 p-0 italic leading-[1.5]"
        style={{ background: "none", borderLeft: "0" }}
      >
        {children}
      </blockquote>
      {author ? <figcaption className="mt-3 text-sm font-medium text-amber-700">{author}</figcaption> : null}
    </figure>
  );
}
