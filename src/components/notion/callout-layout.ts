export type CalloutTone =
  | "gray"
  | "brown"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "default";

export type LayoutVariant =
  | "note"
  | "timeline"
  | "exercise"
  | "sectionHeader"
  | "result"
  | "ai"
  | "theory"
  | "story"
  | "warning";

export function resolveCalloutLayout(tone?: string | null): LayoutVariant {
  switch ((tone ?? "").toLowerCase()) {
    case "gray":
      return "note";
    case "brown":
      return "timeline";
    case "orange":
      return "exercise";
    case "yellow":
      return "sectionHeader";
    case "green":
      return "result";
    case "blue":
      return "ai";
    case "purple":
      return "theory";
    case "pink":
      return "story";
    case "red":
      return "warning";
    default:
      return "note";
  }
}
