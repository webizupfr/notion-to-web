import type { ReactNode } from "react";

type StepItemProps = {
  index: number;
  children: ReactNode;
};

export function StepItem({ index, children }: StepItemProps) {
  return (
    <div className="flex items-start gap-[var(--space-4)]">
      <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:color-mix(in_oklab,var(--accent)_55%,transparent)] bg-[color-mix(in_oklab,var(--accent)_18%,#fff)] font-semibold text-[color:color-mix(in_oklab,var(--accent)_90%,#0f1728)]">
        {index}
      </span>
      <div className="space-y-2 text-[0.97rem] leading-[1.65] text-[color:var(--fg)]/80">{children}</div>
    </div>
  );
}
