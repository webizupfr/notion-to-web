import type { ReactNode } from "react";

export function ErrorState({ title = "Une erreur est survenue", description, action }: { title?: string; description?: string; action?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-rose-200/70 bg-rose-50/70 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-rose-700">{title}</h3>
      {description ? <p className="mt-2 text-sm text-rose-700/90">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </section>
  );
}

