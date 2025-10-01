export type PageMeta = {
  slug: string;
  visibility: "public" | "private";
  password?: string | null;
  notionId: string;
  title: string;
  fullWidth: boolean;
  lastEdited?: string;
  childPages?: Array<{ id: string; title: string; slug: string }>;
}
export type PostMeta = { 
  slug: string; 
  title: string; 
  excerpt?: string|null; 
  notionId: string; 
  cover?: string|null;
  lastEdited?: string;
}
