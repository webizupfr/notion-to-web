import type { ReactNode } from "react";

import { AffirmationCheckWidget } from "@/components/widgets/AffirmationCheckWidget";
import { BranchChoiceWidget } from "@/components/widgets/BranchChoiceWidget";
import { CheckboxWidget } from "@/components/widgets/CheckboxWidget";
import { ChecklistWidget } from "@/components/widgets/ChecklistWidget";
import { FillBlanksWidget } from "@/components/widgets/FillBlanksWidget";
import { FlipCardsWidget } from "@/components/widgets/FlipCardsWidget";
import { FormWidget } from "@/components/widgets/FormWidget";
import { ImagePromptWidget } from "@/components/widgets/ImagePromptWidget";
import { LiveTestWidget } from "@/components/widgets/LiveTestWidget";
import { PlanPromptWidget } from "@/components/widgets/PlanPromptWidget";
import { PlanTableWidget } from "@/components/widgets/PlanTableWidget";
import { PromptTemplateWidget } from "@/components/widgets/PromptTemplateWidget";
import { PromptWidget } from "@/components/widgets/PromptWidget";
import { QuizWidget } from "@/components/widgets/QuizWidget";
import { SimpleChecklistWidget } from "@/components/widgets/SimpleChecklistWidget";
import { SingleChoiceWidget } from "@/components/widgets/SingleChoiceWidget";
import { SuggestionCardsWidget } from "@/components/widgets/SuggestionCardsWidget";
import { TabsFormWidget } from "@/components/widgets/TabsFormWidget";
import { TimeCalcWidget } from "@/components/widgets/TimeCalcWidget";
import type { WidgetConfig } from "@/lib/widget-parser";
import { PersonaBuilderWidget } from "@/components/widgets/PersonaBuilderWidget";
import { PersonaAIWidget } from "@/components/widgets/PersonaAIWidget";
import { EvidenceBoardWidget } from "@/components/widgets/EvidenceBoardWidget";
import { PatternBuilderWidget } from "@/components/widgets/PatternBuilderWidget";
import { BrainstormDeckWidget } from "@/components/widgets/BrainstormDeckWidget";
import { InsightBoardWidget } from "@/components/widgets/InsightBoardWidget";
import { DecisionFocusWidget } from "@/components/widgets/DecisionFocusWidget";

type RenderWidgetOptions = {
  storageKey: string;
};

/**
 * Central render helper so widgets keep a consistent wrapper
 * across Notion blocks (hubs) and YAML-driven sprints.
 */
export function renderWidget(widget: WidgetConfig, { storageKey }: RenderWidgetOptions): ReactNode | null {
  let element: ReactNode | null = null;

  switch (widget.widget) {
    case "form":
      element = <FormWidget config={widget} storageKey={storageKey} />;
      break;
    case "prompt":
      element = <PromptWidget config={widget} storageKey={storageKey} />;
      break;
    case "quiz":
      element = <QuizWidget config={widget} storageKey={storageKey} />;
      break;
    case "image_prompt":
      element = <ImagePromptWidget config={widget} storageKey={storageKey} />;
      break;
    case "branch_choice":
      element = <BranchChoiceWidget config={widget} storageKey={storageKey} />;
      break;
    case "tabs_form":
      element = <TabsFormWidget config={widget} storageKey={storageKey} />;
      break;
    case "checkbox":
      element = <CheckboxWidget config={widget} storageKey={storageKey} />;
      break;
    case "suggestion_cards":
      element = <SuggestionCardsWidget config={widget} storageKey={storageKey} />;
      break;
    case "flip_cards":
      element = <FlipCardsWidget config={widget} storageKey={storageKey} />;
      break;
    case "prompt_template":
      element = <PromptTemplateWidget config={widget} storageKey={storageKey} />;
      break;
    case "fill_blanks":
      element = <FillBlanksWidget config={widget} storageKey={storageKey} />;
      break;
    case "live_test":
      element = <LiveTestWidget config={widget} storageKey={storageKey} />;
      break;
    case "time_calc":
      element = <TimeCalcWidget config={widget} storageKey={storageKey} />;
      break;
    case "checklist":
      element = <ChecklistWidget config={widget} storageKey={storageKey} />;
      break;
    case "plan_table":
      element = <PlanTableWidget config={widget} storageKey={storageKey} />;
      break;
    case "single_choice":
      element = <SingleChoiceWidget config={widget} storageKey={storageKey} />;
      break;
    case "simple_checklist":
      element = <SimpleChecklistWidget config={widget} storageKey={storageKey} />;
      break;
    case "plan_prompt":
      element = <PlanPromptWidget config={widget} storageKey={storageKey} />;
      break;
    case "persona_builder":
      element = <PersonaBuilderWidget config={widget} storageKey={storageKey} />;
      break;
    case "persona_ai":
      element = <PersonaAIWidget config={widget} storageKey={storageKey} />;
      break;
    case "evidence_board":
      element = <EvidenceBoardWidget config={widget} storageKey={storageKey} />;
      break;
    case "pattern_builder":
      element = <PatternBuilderWidget config={widget} storageKey={storageKey} />;
      break;
    case "insight_board":
      element = <InsightBoardWidget config={widget} storageKey={storageKey} />;
      break;
    case "decision_focus":
      element = <DecisionFocusWidget config={widget} storageKey={storageKey} />;
      break;
    case "brainstorm_deck":
      element = <BrainstormDeckWidget config={widget} storageKey={storageKey} />;
      break;
    case "affirmation_check":
      element = <AffirmationCheckWidget config={widget} storageKey={storageKey} />;
      break;
    default:
      element = null;
  }

  if (!element) return null;
  // No decorative wrapper to keep a clean look in sprint context.
  // Widgets are responsible for their own surface/spacing.
  return element;
}
