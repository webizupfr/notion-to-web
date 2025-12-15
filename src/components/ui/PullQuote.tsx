import type { ReactNode } from "react";

type PullQuoteProps = {
  children: ReactNode;
  author?: ReactNode;
};

export function PullQuote({ children, author }: PullQuoteProps) {
  return (
    <figure className="my-1 border-l-4 border-[color:color-mix(in_oklab,var(--accent)_70%,transparent)] bg-[color-mix(in_oklab,var(--accent)_14%,#fff)] px-3 py-0.5 text-[1rem] text-[color:var(--fg)]">
      <blockquote
        className="m-0 p-0 italic leading-[1.5]"
        style={{ background: "none", borderLeft: "0" }}
      >
        {children}
      </blockquote>
      {author ? <figcaption className="mt-3 text-sm font-medium text-[color:color-mix(in_oklab,var(--accent)_80%,#0f1728)]">{author}</figcaption> : null}
    </figure>
  );
}
