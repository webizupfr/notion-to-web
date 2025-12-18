import type { CSSProperties, ReactNode } from "react";

type NotionColumnsProps = {
  columns: ReactNode[];
  ratios?: number[] | null;
};

function normalizeRatios(ratios: number[] | undefined | null, count: number): number[] | null {
  if (!ratios || ratios.length !== count) return null;
  const safe = ratios.map((r) => (Number.isFinite(r) && r > 0 ? Number(r) : 0));
  if (safe.some((r) => r <= 0)) return null;
  const total = safe.reduce((acc, val) => acc + val, 0);
  if (total <= 0) return null;
  return safe.map((r) => r / total);
}

export function NotionColumns({ columns, ratios }: NotionColumnsProps) {
  if (!columns.length) return null;
  const normalizedRatios = normalizeRatios(ratios ?? undefined, columns.length);

  if (normalizedRatios) {
    const template = normalizedRatios.map((ratio) => `${(ratio * 100).toFixed(3)}%`).join(" ");
    const style = {
      "--notion-columns-template": template,
    } as CSSProperties & Record<"--notion-columns-template", string>;
    return (
      <div
        className="notion-columns grid gap-[var(--space-m)]"
        data-layout="weighted"
        style={style}
      >
        {columns.map((col, idx) => (
          <NotionColumn key={idx}>{col}</NotionColumn>
        ))}
      </div>
    );
  }

  const colCount = columns.length;
  if (colCount && colCount <= 4) {
    const classes =
      colCount === 4
        ? "md:grid-cols-2 xl:grid-cols-4"
        : colCount === 3
          ? "md:grid-cols-2 xl:grid-cols-3"
          : "md:grid-cols-2";
    return (
      <div className={`notion-columns grid gap-[var(--space-m)] ${classes}`}>
        {columns.map((col, idx) => (
          <NotionColumn key={idx}>{col}</NotionColumn>
        ))}
      </div>
    );
  }

  return (
    <div className="notion-columns notion-columns--auto grid auto-rows-max gap-[var(--space-m)]">
      {columns.map((col, idx) => (
        <NotionColumn key={idx}>{col}</NotionColumn>
      ))}
    </div>
  );
}

export function NotionColumn({ children }: { children: ReactNode }) {
  return <div className="notion-column">{children}</div>;
}
