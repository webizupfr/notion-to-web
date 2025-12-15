import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import type { NotionBlock } from "@/lib/notion";
import { RichText } from "./RichText";

type Props = {
  id?: string;
  richText: RichTextItemResponse[];
  checked?: boolean | null;
  renderChildren?: (blocks: NotionBlock[]) => ReactNode;
  childrenBlocks?: NotionBlock[];
};

export function NotionTodo({ id, richText, checked, renderChildren, childrenBlocks = [] }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg-elevated)] px-[var(--space-4)] py-[var(--space-3)]">
      <input
        id={id}
        type="checkbox"
        defaultChecked={Boolean(checked)}
        className="mt-1 h-5 w-5 rounded-[var(--r-sm)] border-[var(--border)] bg-white accent-[var(--primary)]"
        aria-checked={checked ? "true" : "false"}
      />
      <div className="space-y-2 text-[var(--fg)]">
        <label htmlFor={id} className="block cursor-pointer text-[1rem] leading-[1.6]">
          <RichText richText={richText} />
        </label>
        {childrenBlocks.length > 0 && renderChildren ? (
          <div className="pl-[var(--space-3)] text-[0.95rem] leading-[1.6]">
            {renderChildren(childrenBlocks)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
