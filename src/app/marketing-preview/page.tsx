import { DefaultMarketingSection, MarketingShell } from "@/components/marketing";
import type { MarketingSectionProps } from "@/components/marketing/sections/types";
import type { NotionBlock } from "@/lib/notion";

const annotations = {
  bold: false,
  italic: false,
  strikethrough: false,
  underline: false,
  code: false,
  color: "default" as const,
};

const textFragment = (content: string) => ({
  type: "text" as const,
  text: { content, link: null },
  annotations,
  plain_text: content,
  href: null,
});

const mockBlockMeta = (id: string) => ({
  object: "block" as const,
  id,
  parent: { type: "page_id" as const, page_id: "marketing-preview" },
  created_time: "1970-01-01T00:00:00.000Z",
  last_edited_time: "1970-01-01T00:00:00.000Z",
  created_by: { object: "user" as const, id: "marketing-preview" },
  last_edited_by: { object: "user" as const, id: "marketing-preview" },
  archived: false,
  has_children: false,
  in_trash: false,
});

const headingBlock = (id: string, content: string): NotionBlock => ({
  ...mockBlockMeta(id),
  type: "heading_2",
  heading_2: {
    rich_text: [textFragment(content)],
    color: "default",
    is_toggleable: false,
  },
});

const paragraphBlock = (id: string, content: string): NotionBlock => ({
  ...mockBlockMeta(id),
  type: "paragraph",
  paragraph: {
    rich_text: [textFragment(content)],
    color: "default",
  },
});

type PreviewSection = {
  id: string;
  tone?: "flat" | "accent" | "highlight" | "dark";
  bodyVariant?: MarketingSectionProps["bodyVariant"];
  title: string;
  description: string;
};

const demoSections: PreviewSection[] = [
  {
    id: "preview-flat",
    tone: "flat",
    title: "Section par défaut",
    description: "Utilise le padding standard et la tonality flat.",
  },
  {
    id: "preview-accent",
    tone: "accent",
    title: "Section accent",
    description: "Montre un ton coloré et davantage d'espace intérieur.",
  },
  {
    id: "preview-highlight",
    tone: "highlight",
    title: "Section highlight",
    description: "Variante lumineuse pour rythmer les pages marketing.",
  },
  {
    id: "preview-dark",
    tone: "dark",
    title: "Tone dark + variant dense",
    description: "Parfait pour des listes compactes comme des FAQ ou des features.",
  },
];

const buildBlocks = (sectionId: string, title: string, description: string): NotionBlock[] => [
  headingBlock(`${sectionId}-h`, title),
  paragraphBlock(`${sectionId}-p1`, description),
  paragraphBlock(
    `${sectionId}-p2`,
    "Cette page sert uniquement de sandbox pour vérifier rapidement les styles marketing sans dépendre d'une page Notion."
  ),
];

export default function MarketingPreviewPage() {
  return (
    <MarketingShell>
      <div className="marketing-sections">
        {demoSections.map((section) => (
          <section key={section.id} className="marketing-section" data-tone={section.tone}>
            <DefaultMarketingSection
              blocks={buildBlocks(section.id, section.title, section.description)}
              baseSlug="marketing-preview"
              bodyVariant={section.bodyVariant}
            />
          </section>
        ))}
      </div>
    </MarketingShell>
  );
}
