import type { ReactNode } from "react";
import type { RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";

import type { ListBlock } from "@/components/notion/utils";
import type { NotionBlock } from "@/lib/notion";
import { RichText } from "./RichText";

type Props = {
  items: ListBlock[];
  type: "bulleted" | "numbered";
  renderChildren?: (blocks: NotionBlock[]) => ReactNode;
};

export function NotionList({ items, type, renderChildren }: Props) {
  const Component = (type === "bulleted" ? "ul" : "ol") as "ul" | "ol";

  return (
    <div className="prose prose-notion">
      <Component className={`prose-list prose-list-${type}`}>
        {items.map((item) => {
          const richText: RichTextItemResponse[] =
            item.type === "numbered_list_item"
              ? item.numbered_list_item.rich_text
              : item.bulleted_list_item.rich_text;

          const childrenBlocks = (item as unknown as { __children?: NotionBlock[] }).__children ?? [];

          return (
            <li key={item.id}>
              <RichText richText={richText} />
              {childrenBlocks.length > 0 && renderChildren ? (
                <div className="prose prose-notion prose-list prose-list-nested">
                  {renderChildren(childrenBlocks)}
                </div>
              ) : null}
            </li>
          );
        })}
      </Component>
    </div>
  );
}
