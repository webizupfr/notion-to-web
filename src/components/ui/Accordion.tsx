"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { IconChevronRight } from "@/components/ui/icons";

type Variant = "info" | "success" | "warning" | "danger" | "neutral";

const variantStyles: Record<Variant, string> = {
  info: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)]",
  success: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)]",
  warning: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)]",
  danger: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,#fff)]",
  neutral: "border-[color:var(--border)] bg-[color-mix(in_oklab,var(--bg)_94%,#fff)]",
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
      className={`ui-card rounded-[var(--r-md)] border px-[var(--space-5)] py-[var(--space-3)] transition ${variantStyles[variant]} ${open ? "" : "shadow-none"}`}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-left text-[0.97rem] font-medium text-[color:var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--primary)]"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <span aria-hidden className={`inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--border)] text-sm transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          <IconChevronRight size={16} />
        </span>
      </button>
      {open ? <div className="mt-[var(--space-3)] space-y-3 text-[0.95rem] text-[color:var(--fg)]/80">{children}</div> : null}
    </div>
  );
}
