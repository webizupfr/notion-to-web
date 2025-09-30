import { notion } from "@/lib/notion";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export type LinkedDatabaseBlock = BlockObjectResponse & {
  linked_db?: { database_id?: string };
  child_database?: { title?: string };
};

export async function resolveDatabaseIdFromBlock(block: LinkedDatabaseBlock): Promise<string | null> {
  const type = block.type;
  const anyBlock = block as unknown as Record<string, unknown>;
  const payload = (anyBlock[type] ?? {}) as Record<string, unknown>;

  if (type === "link_to_page" && payload?.type === "database_id" && payload.database_id) {
    return payload.database_id as string;
  }

  if (type === "child_database") {
    const inlineDbId = block.id;
    try {
      await notion.databases.retrieve({ database_id: inlineDbId });
      return inlineDbId;
    } catch {
      const title = (payload?.title as string | undefined) ?? undefined;
      if (!title) return null;

      const search = await notion.search({
        query: title,
        filter: { property: "object", value: "database" },
      });

      const first = (search.results ?? [])[0];
      if (first && "id" in first) {
        return (first as { id: string }).id;
      }
    }
  }

  return null;
}
