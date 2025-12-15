import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import { RichText } from "./RichText";

type TableRow = RichTextItemResponse[][];

export function NotionTable({
  rows,
  hasColumnHeader = false,
  hasRowHeader = false,
}: {
  rows: TableRow[];
  hasColumnHeader?: boolean;
  hasRowHeader?: boolean;
}): ReactNode {
  if (!rows.length) return null;

  const [headerRow, ...bodyRows] = hasColumnHeader ? rows : [null, ...rows];

  return (
    <div className="notion-table-wrap" data-table-has-row-header={hasRowHeader ? "true" : "false"}>
      <table className="notion-table text-[0.95rem]" data-table-has-row-header={hasRowHeader ? "true" : "false"}>
        {headerRow ? (
          <thead>
            <tr>
              {headerRow.map((cell, idx) => (
                <th
                  key={`h-${idx}`}
                  className={hasRowHeader && idx === 0 ? "min-w-[220px]" : undefined}
                >
                  <RichText richText={cell} />
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
        {bodyRows.map((row, rIdx) => (
            <tr
              key={`r-${rIdx}`}
              className="transition-colors"
            >
              {(row ?? []).map((cell, cIdx) => {
                const isRowHeader = hasRowHeader && cIdx === 0;
                return (
                  <td
                    key={`cell-${rIdx}-${cIdx}`}
                    className={isRowHeader ? "font-semibold text-[var(--fg)] table-row-header" : "text-[var(--muted)]"}
                  >
                    <RichText richText={cell} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
