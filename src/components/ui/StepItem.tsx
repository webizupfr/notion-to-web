import type { ReactNode } from "react";

type StepItemProps = {
  index: number;
  children: ReactNode;
};

export function StepItem({ index, children }: StepItemProps) {
  return (
    <div className="flex items-start gap-4">
      <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-amber-50 font-semibold text-amber-600">
        {index}
      </span>
      <div className="space-y-2 text-[0.97rem] leading-[1.65] text-slate-700">{children}</div>
    </div>
  );
}

