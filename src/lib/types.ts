export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
}
export type PostMeta = { slug: string; title: string; excerpt?: string|null; notionId: string; cover?: string|null }
