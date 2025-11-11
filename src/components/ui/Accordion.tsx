"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/ui/icons";

type Variant = "info" | "success" | "warning" | "danger" | "neutral";

const variantStyles: Record<Variant, string> = {
  info: "border-blue-100 bg-blue-50/70",
  success: "border-emerald-100 bg-emerald-50/70",
  warning: "border-amber-100 bg-amber-50/70",
  danger: "border-rose-100 bg-rose-50/70",
  neutral: "border-slate-200/70 bg-white/80",
};

export type AccordionProps = {
  title: ReactNode;
  children: ReactNode;
  variant?: Variant;
  defaultOpen?: boolean;
};

export function Accordion({ title, children, variant = "neutral", defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      data-open={open ? "1" : undefined}
      className={`ui-card rounded-[18px] border px-5 py-3 transition ${variantStyles[variant]} ${open ? "" : "shadow-none"}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left text-[0.97rem] font-medium text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span aria-hidden className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-sm transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <IconChevronRight size={16} />
        </span>
      </button>
      {open ? <div className="mt-3 space-y-3 text-[0.95rem] text-slate-700">{children}</div> : null}
    </div>
  );
}
