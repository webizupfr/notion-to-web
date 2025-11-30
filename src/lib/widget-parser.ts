import { load } from 'js-yaml';

export type FormFieldConfig = {
  name: string;
  label: string;
  placeholder?: string;
};

export type FormWidgetConfig = {
  widget: 'form';
  title?: string;
  outputTitle?: string;
  fields: FormFieldConfig[];
  template: string;
  alias?: string;
};

export type PromptPlaceholder = {
  name: string;
  label: string;
  hint?: string;
};

export type PromptWidgetConfig = {
  widget: 'prompt';
  title?: string;
  template: string;
  placeholders: PromptPlaceholder[];
  // optional visual tweaks
  theme?: 'light' | 'dark';
  wide?: boolean; // allow author to request a wider surface
};

export type QuizOption = {
  label?: string;
  text: string;
  feedback: string;
  correct?: boolean;
};

export type QuizWidgetConfig = {
  widget: 'quiz';
  title?: string;
  question: string;
  options: QuizOption[];
};

export type ImagePromptSection = {
  id: string;
  label: string;
  type: 'textarea' | 'chips';
  placeholder?: string;
  options?: string[];
};

export type ImagePromptWidgetConfig = {
  widget: 'image_prompt';
  title?: string;
  sections: ImagePromptSection[];
  template: string;
};

export type TabsFormField = {
  name: string;
  label: string;
  placeholder?: string;
};

export type TabsFormSection = {
  id: string;
  label: string;
  help?: string;
  fields: TabsFormField[];
};

export type TabsFormWidgetConfig = {
  widget: 'tabs_form';
  title?: string;
  outputTitle?: string;
  sections: TabsFormSection[];
  template: string;
  previewFromHeading?: string;
  // optional visual tweaks
  previewTheme?: 'light' | 'dark';
  wide?: boolean;
};

// Evidence board (tri des données)
export type EvidenceColumn = {
  id: string;
  label: string;
  help?: string;
};

export type EvidenceBoardWidgetConfig = {
  widget: 'evidence_board';
  title?: string;
  columns: EvidenceColumn[];
};

export type WidgetConfig =
  | FormWidgetConfig
  | PromptWidgetConfig
  | QuizWidgetConfig
  | ImagePromptWidgetConfig
  | TabsFormWidgetConfig
  | BranchChoiceWidgetConfig
  | CheckboxWidgetConfig
  | SuggestionCardsWidgetConfig
  | FlipCardsWidgetConfig
  | PromptTemplateWidgetConfig
  | FillBlanksWidgetConfig
  | LiveTestWidgetConfig
  | TimeCalcWidgetConfig
  | ChecklistWidgetConfig
  | PlanTableWidgetConfig
  | SimpleChecklistWidgetConfig
  | SingleChoiceWidgetConfig
  | AffirmationCheckWidgetConfig
  | PlanPromptWidgetConfig
  | PersonaAIWidgetConfig
  | EvidenceBoardWidgetConfig
  | PatternBuilderWidgetConfig
  | InsightBoardWidgetConfig
  | DecisionFocusWidgetConfig
  | BrainstormDeckWidgetConfig
  | PersonaBuilderWidgetConfig;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function slugifyLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseFields(input: unknown): FormFieldConfig[] {
  if (!Array.isArray(input)) return [];
  const out: FormFieldConfig[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const nameRaw = typeof record.name === 'string' ? record.name.trim() : '';
    const labelRaw = typeof record.label === 'string' ? record.label : '';
    const name = nameRaw || (labelRaw ? slugifyLabel(labelRaw) : '');
    if (!name) continue;
    out.push({
      name,
      label: labelRaw || name,
      placeholder: typeof record.placeholder === 'string' ? record.placeholder : undefined,
    });
  }
  return out;
}

function parsePlaceholders(input: unknown): PromptPlaceholder[] {
  if (!Array.isArray(input)) return [];
  const out: PromptPlaceholder[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) continue;
    out.push({
      name,
      label: typeof record.label === 'string' ? record.label : name,
      hint: typeof record.hint === 'string' ? record.hint : undefined,
    });
  }
  return out;
}

function parseQuizOptions(input: unknown): QuizOption[] {
  if (!Array.isArray(input)) return [];
  const out: QuizOption[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const textRaw = typeof record.text === 'string' ? record.text : typeof record.prompt === 'string' ? record.prompt : '';
    const feedbackRaw = typeof record.feedback === 'string' ? record.feedback : '';
    if (!textRaw.trim()) continue;
    out.push({
      label: typeof record.label === 'string' ? record.label : undefined,
      text: textRaw,
      feedback: feedbackRaw,
      correct: Boolean(record.correct),
    });
  }
  return out;
}

function parseImageSections(input: unknown): ImagePromptSection[] {
  if (!Array.isArray(input)) return [];
  const out: ImagePromptSection[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    if (!id) continue;
    const typeRaw = typeof record.type === 'string' ? record.type.trim().toLowerCase() : 'textarea';
    const type: ImagePromptSection['type'] = typeRaw === 'chips' ? 'chips' : 'textarea';
    const options =
      type === 'chips' && Array.isArray(record.options)
        ? record.options
            .map((value) => (typeof value === 'string' ? value : null))
            .filter((value): value is string => Boolean(value))
        : undefined;
    out.push({
      id,
      label: typeof record.label === 'string' ? record.label : id,
      type,
      placeholder: typeof record.placeholder === 'string' ? record.placeholder : undefined,
      options,
    });
  }
  return out;
}

function parseTabsFields(input: unknown): TabsFormField[] {
  if (!Array.isArray(input)) return [];
  const out: TabsFormField[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const nameRaw = typeof record.name === 'string' ? record.name.trim() : '';
    const labelRaw = typeof record.label === 'string' ? record.label : '';
    const name = nameRaw || (labelRaw ? slugifyLabel(labelRaw) : '');
    if (!name) continue;
    out.push({
      name,
      label: labelRaw || name,
      placeholder: typeof record.placeholder === 'string' ? record.placeholder : undefined,
    });
  }
  return out;
}

function parseTabsSections(input: unknown): TabsFormSection[] {
  if (!Array.isArray(input)) return [];
  const out: TabsFormSection[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const idRaw = typeof record.id === 'string' ? record.id.trim() : '';
    const labelRaw = typeof record.label === 'string' ? record.label : '';
    const id = idRaw || (labelRaw ? slugifyLabel(labelRaw) : '');
    if (!id) continue;
    const fields = parseTabsFields(record.fields);
    out.push({
      id,
      label: labelRaw || id,
      help: typeof record.help === 'string' ? record.help : undefined,
      fields,
    });
  }
  return out;
}

export type BranchChoiceOption = {
  label: string;
  description?: string;
  href?: string; // explicit target path
  activityId?: string; // Notion page ID for an activity (builds ?activity=... link)
};

export type BranchChoiceWidgetConfig = {
  widget: 'branch_choice';
  title?: string;
  question: string;
  options: BranchChoiceOption[];
};

function parseBranchOptions(input: unknown): BranchChoiceOption[] {
  if (!Array.isArray(input)) return [];
  const out: BranchChoiceOption[] = [];
  for (const entry of input) {
    const record = asRecord(entry);
    if (!record) continue;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const href = typeof (record as { href?: unknown }).href === 'string' ? (record as { href: string }).href.trim() : undefined;
    const activityId = typeof (record as { activityId?: unknown }).activityId === 'string' ? (record as { activityId: string }).activityId.trim() : undefined;
    if (!label || (!href && !activityId)) continue;
    out.push({
      label,
      href,
      activityId,
      description: typeof record.description === 'string' ? record.description : undefined,
    });
  }
  return out;
}

export type CheckboxWidgetConfig = {
  widget: 'checkbox';
  label: string;
  description?: string;
  default?: boolean;
};

// New: suggestion cards widget
export type SuggestionCard = {
  title: string;
  suggestions: string[];
};
export type SuggestionCardsWidgetConfig = {
  widget: 'suggestion_cards';
  title?: string;
  cards: SuggestionCard[];
};

// Flip cards (animated) – front shows title, on click flips and shows random suggestion
export type FlipCard = {
  title: string;
  suggestions: string[];
};
export type FlipCardsWidgetConfig = {
  widget: 'flip_cards';
  title?: string;
  cards: FlipCard[];
};

// Prompt template with auto fields extracted from {PLACEHOLDER}
export type AutoPromptField = {
  name: string;
  label?: string;
  type?: 'text' | 'textarea' | 'chips';
  placeholder?: string;
  default?: string;
  options?: string[];
};
export type PromptTemplateWidgetConfig = {
  widget: 'prompt_template';
  title?: string;
  template: string;
  fields: AutoPromptField[];
  // optional visual tweaks (align with PromptWidget)
  theme?: 'light' | 'dark';
  wide?: boolean;
};

// Fill-in-the-blanks widget (inline inputs inside a rich template)
export type FillBlanksField = { name: string; label?: string };
export type FillBlanksWidgetConfig = {
  widget: 'fill_blanks';
  title?: string;
  template: string; // supports [label] or {NAME}
  fields: FillBlanksField[]; // auto-detected if not provided in YAML
};

// Live test (checkbox scoring)
export type LiveTestRule = { minYes: number; label: string; color?: string };
export type LiveTestWidgetConfig = {
  widget: 'live_test';
  title?: string;
  description?: string;
  questions: Array<string | { text: string }>;
  rules?: LiveTestRule[];
};

// Time calculator
export type TimeCalcWidgetConfig = {
  widget: 'time_calc';
  title?: string;
  description?: string;
  weeksPerMonth?: number; // default 4.3
  currency?: string; // e.g., "€"
  hourlyRate?: number; // optional value calc
};

// Checklist widget
export type ChecklistItem = { label: string; help?: string };
export type ChecklistWidgetConfig = {
  widget: 'checklist';
  title?: string;
  items: ChecklistItem[];
  columns?: 1 | 2; // responsive base; mobile reste 1
  cta?: { label: string; href?: string };
};

// Plan table (liste structurée: titre, explication, champ à remplir)
export type PlanTableRow = { title: string; info?: string; placeholder?: string; multiline?: boolean };
export type PlanTableWidgetConfig = {
  widget: 'plan_table';
  title?: string;
  rows: PlanTableRow[];
  alias?: string; // optional shared key to allow other widgets to read its values
};

// Single choice (radio) – helps decide without triggering any action
export type SingleChoiceOption = { label: string; description?: string; value?: string };
export type SingleChoiceWidgetConfig = {
  widget: 'single_choice';
  title?: string;
  question?: string;
  options: SingleChoiceOption[];
  defaultIndex?: number;
};

export type SimpleChecklistItem = { text: string; heading?: boolean };
export type SimpleChecklistWidgetConfig = {
  widget: 'simple_checklist';
  title?: string;
  items: SimpleChecklistItem[];
  showBoxes?: boolean;
};

// Affirmation check (table Test | Question | Oui? | Notes)
export type AffirmationCheckItem = { test: string; question: string };
export type AffirmationCheckWidgetConfig = {
  widget: 'affirmation_check';
  title?: string;
  items: AffirmationCheckItem[];
  showNotes?: boolean;
};

// Plan prompt (reads from plan_table by alias and builds a prompt)
export type PlanPromptWidgetConfig = {
  widget: 'plan_prompt';
  title?: string;
  sourceAlias: string;
};

// Persona AI aggregator (reads two form aliases and builds a prompt + draft sheet)
export type PersonaAIWidgetConfig = {
  widget: 'persona_ai';
  title?: string;
  profileAlias: string;
  hypothesesAlias: string;
};

// Persona builder (profile + hypotheses -> final sheet)
export type PersonaField = { id: string; label: string; placeholder?: string };
export type PersonaBuilderWidgetConfig = {
  widget: 'persona_builder';
  title?: string;
  outputTitle?: string;
  profile?: { fields?: PersonaField[] };
  hypotheses?: { fields?: PersonaField[] };
  template?: string; // optional custom output template
};

// Pattern builder (rows of theme/observation/interpretation)
export type PatternField = { id: string; label: string; type?: 'text' | 'textarea'; placeholder?: string };
export type PatternBuilderWidgetConfig = {
  widget: 'pattern_builder';
  title?: string;
  fields?: PatternField[]; // default 3 columns
  outputLabel?: string;
  outputFormat?: 'table' | 'markdown';
};

export type InsightBoardColumn = { id: string; label: string; placeholder?: string };
export type InsightBoardWidgetConfig = {
  widget: 'insight_board';
  title?: string;
  columns?: InsightBoardColumn[];
  maxRows?: number;
  help?: string;
};

export type DecisionFocusField = {
  id: string;
  label: string;
  placeholder?: string;
  impactLabel?: string;
  impactPlaceholder?: string;
  effortLabel?: string;
  effortPlaceholder?: string;
  optional?: boolean;
};
export type DecisionFocusWidgetConfig = {
  widget: 'decision_focus';
  title?: string;
  subtitle?: string;
  fields?: DecisionFocusField[];
  outputTitle?: string;
  outputTemplate?: string;
};

// Brainstorm single-card deck
export type BrainstormCard = { id: string; type: 'image' | 'prompt' | 'constraint'; text?: string; imageUrl?: string; credit?: string; tags?: string[] };
export type BrainstormDeckWidgetConfig = {
  widget: 'brainstorm_deck';
  title?: string;
  timerMinutes?: number;
  cards?: BrainstormCard[];
  dataset?: string; // optional dataset key/path (e.g. "brainstorm/ideation")
};

export function parseWidget(code: string): WidgetConfig | null {
  let data: unknown;
  try {
    data = load(code);
  } catch (error) {
    console.warn('[widget] YAML parse failed', error);
    return null;
  }

  const root = asRecord(data);
  if (!root) return null;

  const rawKind = (root.widget ?? root.type ?? root.kind) as unknown;
  let widgetType = typeof rawKind === 'string' ? rawKind.toLowerCase() : '';

  // Detect shorthand: { fill_blanks: { ... } }
  let obj: Record<string, unknown> = root;
  if (!widgetType) {
    const known = new Set([
      'form','prompt','quiz','image_prompt','tabs_form','branch_choice','checkbox','suggestion_cards','flip_cards','prompt_template','fill_blanks','live_test','time_calc','checklist','plan_table','single_choice','simple_checklist','plan_prompt','affirmation_check','persona_builder','persona_ai','evidence_board','pattern_builder','insight_board','decision_focus','brainstorm_deck'
    ]);
    const keys = Object.keys(root).filter((k) => known.has(k));
    if (keys.length === 1) {
      const k = keys[0];
      const nested = asRecord((root as Record<string, unknown>)[k]);
      if (nested) {
        widgetType = k;
        obj = nested;
      }
    }
  }

  if (widgetType === 'form') {
    const rawTemplate = typeof obj.template === 'string'
      ? obj.template
      : (typeof (obj as Record<string, unknown>).output_template === 'string'
        ? ((obj as Record<string, unknown>).output_template as string)
        : '');
    const template = rawTemplate
      .replace(/\{\s*([^{}]+?)\s*\}/g, (_, p1: string) => `{${slugifyLabel(p1)}}`)
      .replace(/\[([^\]]+)\]/g, (_, p1: string) => `{${slugifyLabel(p1)}}`);
    if (!template.trim()) return null;

    return {
      widget: 'form',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      outputTitle: typeof obj.outputTitle === 'string' ? obj.outputTitle : undefined,
      fields: parseFields(obj.fields),
      template,
      alias: typeof (obj as Record<string, unknown>).alias === 'string' ? ((obj as Record<string, unknown>).alias as string) : undefined,
    } satisfies FormWidgetConfig;
  }

  if (widgetType === 'prompt') {
    const template = typeof obj.template === 'string' ? obj.template : '';
    if (!template.trim()) return null;

    return {
      widget: 'prompt',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      template,
      placeholders: parsePlaceholders(obj.placeholders),
      theme: ((): 'light' | 'dark' | undefined => {
        const t = (obj as Record<string, unknown>).theme;
        return t === 'dark' ? 'dark' : t === 'light' ? 'light' : undefined;
      })(),
      wide: Boolean((obj as Record<string, unknown>).wide),
    } satisfies PromptWidgetConfig;
  }

  if (widgetType === 'persona_builder') {
    const readFields = (input: unknown, defaults: PersonaField[]): PersonaField[] => {
      const raw = (asRecord(input)?.fields as unknown[]) ?? [];
      if (!Array.isArray(raw) || raw.length === 0) return defaults;
      const out: PersonaField[] = [];
      for (const entry of raw) {
        const rec = asRecord(entry);
        if (!rec) continue;
        const idRaw = typeof rec.id === 'string' ? rec.id.trim() : '';
        const labelRaw = typeof rec.label === 'string' ? rec.label : '';
        const id = idRaw || (labelRaw ? slugifyLabel(labelRaw) : '');
        if (!id) continue;
        out.push({ id, label: labelRaw || id, placeholder: typeof rec.placeholder === 'string' ? rec.placeholder : undefined });
      }
      return out.length ? out : defaults;
    };

    const defaultProfile: PersonaField[] = [
      { id: 'profil', label: 'Profil', placeholder: 'Âge, rôle, situation, environnement…' },
      { id: 'contexte', label: 'Contexte typique', placeholder: 'Quand / où le problème apparaît ?' },
      { id: 'comportement', label: 'Ce qu’il fait', placeholder: 'Comportement ou habitude observable' },
      { id: 'ressenti', label: 'Ce qu’il ressent / dit', placeholder: 'Verbatims, émotions, réactions' },
      { id: 'essais', label: 'Ce qu’il essaie déjà', placeholder: 'Solutions bricolées, contournements' },
    ];
    const defaultHypo: PersonaField[] = [
      { id: 'cherche', label: 'Ce qu’il cherche', placeholder: 'Besoins, désirs, résultats attendus' },
      { id: 'bloque', label: 'Ce qui le bloque', placeholder: 'Freins, erreurs, contournements, excuses' },
      { id: 'croyances', label: 'Ce qu’on croit de lui (biais)', placeholder: 'Hypothèses internes, à confronter' },
    ];

    const profileFields = readFields((obj as Record<string, unknown>).profile, defaultProfile);
    const hypoFields = readFields((obj as Record<string, unknown>).hypotheses, defaultHypo);
    const template = typeof (obj as Record<string, unknown>).template === 'string' ? ((obj as Record<string, unknown>).template as string) : undefined;

    return {
      widget: 'persona_builder',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      outputTitle: typeof (obj as Record<string, unknown>).outputTitle === 'string' ? ((obj as Record<string, unknown>).outputTitle as string) : undefined,
      profile: { fields: profileFields },
      hypotheses: { fields: hypoFields },
      template,
    } satisfies PersonaBuilderWidgetConfig;
  }

  if (widgetType === 'evidence_board') {
    const rawCols = Array.isArray((obj as Record<string, unknown>).columns) ? ((obj as Record<string, unknown>).columns as unknown[]) : [];
    const cols: EvidenceColumn[] = [];
    for (const entry of rawCols) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const idRaw = typeof rec.id === 'string' ? rec.id.trim() : '';
      const labelRaw = typeof rec.label === 'string' ? rec.label : '';
      const id = idRaw || (labelRaw ? slugifyLabel(labelRaw) : '');
      if (!id) continue;
      cols.push({ id, label: labelRaw || id, help: typeof rec.help === 'string' ? rec.help : undefined });
    }
    if (!cols.length) {
      cols.push(
        { id: 'confirme', label: '✅ Confirmé', help: 'Ce qui valide vos hypothèses' },
        { id: 'infirme', label: '❌ Infirme', help: 'Ce qui les contredit' },
        { id: 'surprend', label: '💡 Surprend', help: "Ce que vous n’aviez pas anticipé" },
      );
    }
    return { widget: 'evidence_board', title: typeof obj.title === 'string' ? obj.title : undefined, columns: cols } satisfies EvidenceBoardWidgetConfig;
  }

  if (widgetType === 'pattern_builder') {
    const raw = Array.isArray((obj as Record<string, unknown>).fields) ? ((obj as Record<string, unknown>).fields as unknown[]) : [];
    const fields: PatternField[] = [];
    for (const entry of raw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const idRaw = typeof rec.id === 'string' ? rec.id.trim() : '';
      const labelRaw = typeof rec.label === 'string' ? rec.label : '';
      const id = idRaw || (labelRaw ? slugifyLabel(labelRaw) : '');
      if (!id) continue;
      const typeRaw = typeof rec.type === 'string' ? (rec.type as string).toLowerCase() : 'text';
      const type: 'text' | 'textarea' = typeRaw === 'textarea' ? 'textarea' : 'text';
      fields.push({ id, label: labelRaw || id, type, placeholder: typeof rec.placeholder === 'string' ? rec.placeholder : undefined });
    }
    if (!fields.length) {
      fields.push(
        { id: 'symptome', label: 'Symptôme (Observation)', type: 'textarea', placeholder: 'Verbatim exact / comportement observé' },
        { id: 'cause', label: 'Cause possible (Ce que ça montre)', type: 'textarea', placeholder: 'Besoin/tension/opportunité derrière le symptôme' },
        { id: 'opportunite', label: 'Opportunité (Angle d’exploration)', type: 'text', placeholder: 'Ex. piste à tester / question à creuser' },
      );
    }
    const outputLabel = typeof (obj as Record<string, unknown>).output_label === 'string' ? ((obj as Record<string, unknown>).output_label as string) : (typeof (obj as Record<string, unknown>).outputLabel === 'string' ? ((obj as Record<string, unknown>).outputLabel as string) : undefined);
    const outputFormatRaw = typeof (obj as Record<string, unknown>).output_format === 'string' ? ((obj as Record<string, unknown>).output_format as string) : (typeof (obj as Record<string, unknown>).outputFormat === 'string' ? ((obj as Record<string, unknown>).outputFormat as string) : 'table');
    const outputFormat: 'table' | 'markdown' = outputFormatRaw === 'markdown' ? 'markdown' : 'table';
    return { widget: 'pattern_builder', title: typeof obj.title === 'string' ? obj.title : undefined, fields, outputLabel, outputFormat } satisfies PatternBuilderWidgetConfig;
  }

  if (widgetType === 'insight_board') {
    const rawCols = Array.isArray((obj as Record<string, unknown>).columns) ? ((obj as Record<string, unknown>).columns as unknown[]) : [];
    const columns: InsightBoardColumn[] = [];
    for (const entry of rawCols) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const idRaw = typeof rec.id === 'string' ? rec.id.trim() : '';
      const labelRaw = typeof rec.label === 'string' ? rec.label.trim() : '';
      const id = idRaw || (labelRaw ? slugifyLabel(labelRaw) : 'col_' + (columns.length + 1));
      if (!id) continue;
      columns.push({
        id,
        label: labelRaw || id,
        placeholder: typeof rec.placeholder === 'string' ? rec.placeholder : undefined,
      });
    }
    if (!columns.length) {
      columns.push(
        { id: 'works', label: '✅ On garde', placeholder: 'Ce qui fonctionne, ce qui crée de la valeur.' },
        { id: 'frictions', label: '⚠️ À améliorer', placeholder: 'Ce qui bloque ou prête à confusion.' },
        { id: 'opportunities', label: '💡 Piste nouvelle', placeholder: 'Idée ou opportunité inattendue.' },
      );
    }
    const maxRowsRaw = Number((obj as Record<string, unknown>).maxRows ?? NaN);
    return {
      widget: 'insight_board',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      columns,
      maxRows: Number.isFinite(maxRowsRaw) && maxRowsRaw > 0 ? Math.floor(maxRowsRaw) : undefined,
      help: typeof (obj as Record<string, unknown>).help === 'string' ? ((obj as Record<string, unknown>).help as string) : undefined,
    } satisfies InsightBoardWidgetConfig;
  }

  if (widgetType === 'decision_focus') {
    const fieldsRaw = Array.isArray((obj as Record<string, unknown>).fields) ? ((obj as Record<string, unknown>).fields as unknown[]) : [];
    const fields: DecisionFocusField[] = [];
    for (const entry of fieldsRaw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const labelRaw = typeof rec.label === 'string' ? rec.label.trim() : '';
      const idRaw = typeof rec.id === 'string' ? rec.id.trim() : '';
      const id = idRaw || (labelRaw ? slugifyLabel(labelRaw) : 'field_' + (fields.length + 1));
      if (!id) continue;
      fields.push({
        id,
        label: labelRaw || id,
        placeholder: typeof rec.placeholder === 'string' ? rec.placeholder : undefined,
        impactLabel: typeof rec.impactLabel === 'string' ? rec.impactLabel : undefined,
        impactPlaceholder: typeof rec.impactPlaceholder === 'string' ? rec.impactPlaceholder : undefined,
        effortLabel: typeof rec.effortLabel === 'string' ? rec.effortLabel : undefined,
        effortPlaceholder: typeof rec.effortPlaceholder === 'string' ? rec.effortPlaceholder : undefined,
        optional: Boolean(rec.optional),
      });
    }
    if (!fields.length) {
      fields.push(
        {
          id: 'adjustment_1',
          label: 'Ajustement prioritaire #1',
          placeholder: 'Quelle évolution voulez-vous tester ? (action concrète)',
          impactLabel: 'Impact visé',
          impactPlaceholder: 'Quelle valeur cela apporte ? Pourquoi c’est prioritaire ?',
          effortLabel: 'Effort estimé',
          effortPlaceholder: 'Faible / moyen / élevé, ressources nécessaires…',
        },
        {
          id: 'adjustment_2',
          label: 'Ajustement prioritaire #2 (optionnel)',
          placeholder: 'Evolution secondaire à prototyper',
          impactLabel: 'Impact visé',
          impactPlaceholder: 'Résultat attendu',
          effortLabel: 'Effort estimé',
          effortPlaceholder: 'Temps, ressources, complexité',
          optional: true,
        },
      );
    }
    return {
      widget: 'decision_focus',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      subtitle: typeof (obj as Record<string, unknown>).subtitle === 'string' ? ((obj as Record<string, unknown>).subtitle as string) : undefined,
      fields,
      outputTitle: typeof (obj as Record<string, unknown>).outputTitle === 'string' ? ((obj as Record<string, unknown>).outputTitle as string) : undefined,
      outputTemplate: typeof (obj as Record<string, unknown>).outputTemplate === 'string' ? ((obj as Record<string, unknown>).outputTemplate as string) : undefined,
    } satisfies DecisionFocusWidgetConfig;
  }

  if (widgetType === 'brainstorm_deck') {
    const cardsRaw = Array.isArray((obj as Record<string, unknown>).cards) ? ((obj as Record<string, unknown>).cards as unknown[]) : [];
    const cards: BrainstormCard[] = [];
    for (const entry of cardsRaw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const id = typeof rec.id === 'string' ? rec.id.trim() : '';
      const typeRaw = typeof rec.type === 'string' ? rec.type.trim().toLowerCase() : '';
      const type = typeRaw === 'image' || typeRaw === 'prompt' || typeRaw === 'constraint' ? (typeRaw as BrainstormCard['type']) : null;
      if (!id || !type) continue;
      const text = typeof rec.text === 'string' ? rec.text : undefined;
      const imageUrl = typeof (rec as { imageUrl?: unknown }).imageUrl === 'string' ? ((rec as { imageUrl: string }).imageUrl) : undefined;
      const credit = typeof rec.credit === 'string' ? rec.credit : undefined;
      const tags = Array.isArray((rec as { tags?: unknown }).tags) ? ((rec as { tags: unknown[] }).tags).map(v => typeof v === 'string' ? v : '').filter(Boolean) : undefined;
      cards.push({ id, type, text, imageUrl, credit, tags });
    }
    const dataset = typeof (obj as Record<string, unknown>).dataset === 'string' ? ((obj as Record<string, unknown>).dataset as string) : undefined;
    if (!cards.length && !dataset) return null;
    const timerMinutesRaw = Number((obj as Record<string, unknown>).timerMinutes ?? NaN);
    return {
      widget: 'brainstorm_deck',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      timerMinutes: Number.isFinite(timerMinutesRaw) ? timerMinutesRaw : undefined,
      cards: cards.length ? cards : undefined,
      dataset,
    } satisfies BrainstormDeckWidgetConfig;
  }

  if (widgetType === 'quiz') {
    const question = typeof obj.question === 'string' ? obj.question : '';
    const options = parseQuizOptions(obj.options);
    if (!question.trim() || options.length === 0) return null;

    return {
      widget: 'quiz',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      question,
      options,
    } satisfies QuizWidgetConfig;
  }

  if (widgetType === 'image_prompt') {
    const template = typeof obj.template === 'string' ? obj.template : '';
    if (!template.trim()) return null;

    const sections = parseImageSections(obj.sections);
    if (!sections.length) return null;

    return {
      widget: 'image_prompt',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      sections,
      template,
    } satisfies ImagePromptWidgetConfig;
  }

  if (widgetType === 'tabs_form') {
    const rawTemplate = typeof obj.template === 'string'
      ? obj.template
      : (typeof (obj as Record<string, unknown>).output_template === 'string'
        ? ((obj as Record<string, unknown>).output_template as string)
        : (asRecord((obj as Record<string, unknown>).generate)?.output_template as string | undefined) || '');
    const template = rawTemplate
      .replace(/\{\s*([^{}]+?)\s*\}/g, (_, p1: string) => `{${slugifyLabel(p1)}}`)
      .replace(/\[([^\]]+)\]/g, (_, p1: string) => `{${slugifyLabel(p1)}}`);
    if (!template.trim()) return null;

    let sections = parseTabsSections(obj.sections);
    if (!sections.length) {
      // Accept shorthand: tabs: [{ label, placeholder }]
      const tabsRaw = Array.isArray((obj as Record<string, unknown>).tabs) ? (((obj as Record<string, unknown>).tabs) as unknown[]) : [];
      if (tabsRaw.length) {
        const conv: unknown[] = tabsRaw.map((t) => {
          const r = asRecord(t) ?? {};
          const label = typeof (r as Record<string, unknown>).label === 'string' ? ((r as Record<string, unknown>).label as string) : '';
          const placeholder = typeof (r as Record<string, unknown>).placeholder === 'string' ? ((r as Record<string, unknown>).placeholder as string) : undefined;
          const id = label ? slugifyLabel(label) : undefined;
          return { id, label, fields: [{ name: id ?? 'field', label, placeholder }] };
        });
        sections = parseTabsSections(conv);
      }
    }
    if (!sections.length) return null;

    return {
      widget: 'tabs_form',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      outputTitle: typeof obj.outputTitle === 'string' ? obj.outputTitle : (asRecord((obj as Record<string, unknown>).generate)?.label as string | undefined),
      sections,
      template,
      previewFromHeading: typeof obj.previewFromHeading === 'string' ? obj.previewFromHeading : undefined,
      previewTheme: ((): 'light' | 'dark' | undefined => {
        const t = (obj as Record<string, unknown>).previewTheme;
        return t === 'dark' ? 'dark' : t === 'light' ? 'light' : undefined;
      })(),
      wide: Boolean((obj as Record<string, unknown>).wide),
    } satisfies TabsFormWidgetConfig;
  }

  if (widgetType === 'branch_choice') {
    const question = typeof obj.question === 'string' ? obj.question : '';
    const options = parseBranchOptions(obj.options);
    if (!question.trim() || options.length === 0) return null;
    return {
      widget: 'branch_choice',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      question,
      options,
    } satisfies BranchChoiceWidgetConfig;
  }

  if (widgetType === 'checkbox') {
    const label = typeof obj.label === 'string' ? obj.label : '';
    if (!label.trim()) return null;
    return {
      widget: 'checkbox',
      label,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      default: Boolean(obj.default),
    } satisfies CheckboxWidgetConfig;
  }

  // suggestion cards (random suggestion per card)
  if (widgetType === 'suggestion_cards') {
    const title = typeof obj.title === 'string' ? obj.title : undefined;
    const cardsRaw = Array.isArray(obj.cards) ? (obj.cards as unknown[]) : [];
    const cards: SuggestionCard[] = [];
    for (const entry of cardsRaw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const t = typeof rec.title === 'string' ? rec.title.trim() : '';
      const suggestions = Array.isArray(rec.suggestions)
        ? (rec.suggestions as unknown[])
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .filter((v) => v.length > 0)
        : [];
      if (!t || suggestions.length === 0) continue;
      cards.push({ title: t, suggestions });
    }
    if (cards.length === 0) return null;
    return { widget: 'suggestion_cards', title, cards } satisfies SuggestionCardsWidgetConfig;
  }

  if (widgetType === 'flip_cards') {
    const title = typeof obj.title === 'string' ? obj.title : undefined;
    const cardsRaw = Array.isArray(obj.cards) ? (obj.cards as unknown[]) : [];
    const cards: FlipCard[] = [];
    for (const entry of cardsRaw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const t = typeof rec.title === 'string' ? rec.title.trim() : '';
      const suggestions = Array.isArray(rec.suggestions)
        ? (rec.suggestions as unknown[])
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .filter((v) => v.length > 0)
        : [];
      if (!t || suggestions.length === 0) continue;
      cards.push({ title: t, suggestions });
    }
    if (cards.length === 0) return null;
    return { widget: 'flip_cards', title, cards } satisfies FlipCardsWidgetConfig;
  }

  if (widgetType === 'prompt_template') {
    const template = typeof obj.template === 'string' ? obj.template : '';
    if (!template.trim()) return null;

    const explicit = Array.isArray(obj.fields) ? (obj.fields as unknown[]) : [];
    let fields: AutoPromptField[] = [];

    // Helper to create human label
    const labelOf = (name: string) =>
      name
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());

    if (explicit.length) {
      for (const entry of explicit) {
        const rec = asRecord(entry);
        if (!rec) continue;
        const name = typeof rec.name === 'string' ? rec.name.trim() : '';
        if (!name) continue;
        const typeRaw = typeof rec.type === 'string' ? rec.type.trim().toLowerCase() : undefined;
        const type: AutoPromptField['type'] =
          typeRaw === 'textarea' ? 'textarea' : typeRaw === 'chips' ? 'chips' : 'text';
        const options =
          type === 'chips' && Array.isArray(rec.options)
            ? (rec.options as unknown[])
                .map((v) => (typeof v === 'string' ? v.trim() : ''))
                .filter((v) => v.length > 0)
            : undefined;
        fields.push({
          name,
          label: typeof rec.label === 'string' ? rec.label : labelOf(name),
          type,
          placeholder: typeof rec.placeholder === 'string' ? rec.placeholder : undefined,
          default: typeof rec.default === 'string' ? rec.default : undefined,
          options,
        });
      }
    } else {
      // auto-detect placeholders like {RUN_TIME}
      const set = new Set<string>();
      const re = /(?<!\{)\{\s*([A-Za-z0-9_\.\-]+)\s*\}(?!\})/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(template))) {
        set.add(m[1]);
      }
      const names = Array.from(set);
      fields = names.map((n) => {
        const upper = n.toUpperCase();
        const isArea = /BLOCK|LIST|TEXT|DESCRIPTION|PARAGRAPH|QUERIES/.test(upper);
        return { name: n, label: labelOf(n), type: isArea ? 'textarea' : 'text' } satisfies AutoPromptField;
      });
    }

    return {
      widget: 'prompt_template',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      template,
      fields,
      theme: ((): 'light' | 'dark' | undefined => {
        const t = (obj as Record<string, unknown>).theme;
        return t === 'dark' ? 'dark' : t === 'light' ? 'light' : undefined;
      })(),
      wide: Boolean((obj as Record<string, unknown>).wide),
    } satisfies PromptTemplateWidgetConfig;
  }

  if (widgetType === 'fill_blanks') {
    const template = typeof obj.template === 'string' ? obj.template : '';
    if (!template.trim()) return null;

    // If fields not provided, derive from [label] and {NAME}
    const explicit = Array.isArray(obj.fields) ? (obj.fields as unknown[]) : [];
    const fields: FillBlanksField[] = [];

    const pushUnique = (name: string, label?: string) => {
      if (!name) return;
      if (fields.some((f) => f.name === name)) return;
      fields.push({ name, label });
    };

    if (explicit.length) {
      for (const entry of explicit) {
        const rec = asRecord(entry);
        if (!rec) continue;
        const name = typeof rec.name === 'string' ? rec.name.trim() : '';
        if (!name) continue;
        const label = typeof rec.label === 'string' ? rec.label : undefined;
        pushUnique(name, label);
      }
    } else {
      const slug = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

      // [label]
      const bracket = /\[([^\]]+)\]/g;
      let m: RegExpExecArray | null;
      const seen = new Set<string>();
      while ((m = bracket.exec(template))) {
        const raw = (m[1] || '').trim();
        if (!raw) continue;
        const name = slug(raw) || `field_${fields.length + 1}`;
        if (seen.has(name)) continue;
        seen.add(name);
        pushUnique(name, raw);
      }
      // {NAME}
      const curly = /(?<!\{)\{\s*([A-Za-z0-9_\.\-]+)\s*\}(?!\})/g;
      while ((m = curly.exec(template))) {
        const nm = (m[1] || '').trim();
        if (!nm) continue;
        pushUnique(nm);
      }
    }

    return { widget: 'fill_blanks', title: typeof obj.title === 'string' ? obj.title : undefined, template, fields } satisfies FillBlanksWidgetConfig;
  }

  if (widgetType === 'live_test') {
    const questionsRaw = Array.isArray(obj.questions) ? (obj.questions as unknown[]) : [];
    const questions = questionsRaw
      .map((q) => (typeof q === 'string' ? q.trim() : (asRecord(q)?.text as string | undefined)?.trim() || ''))
      .filter((q) => q.length > 0);
    if (!questions.length) return null;

    const rulesRaw = Array.isArray(obj.rules) ? (obj.rules as unknown[]) : [];
    const rules: LiveTestRule[] = rulesRaw
      .map((r) => {
        const rec = asRecord(r);
        if (!rec) return null;
        const minYes = Number((rec.minYes as unknown) ?? NaN);
        const label = typeof rec.label === 'string' ? rec.label : '';
        const color = typeof rec.color === 'string' ? rec.color : undefined;
        if (!Number.isFinite(minYes) || !label) return null;
        return { minYes, label, color } as LiveTestRule;
      })
      .filter((x): x is LiveTestRule => Boolean(x))
      .sort((a, b) => b.minYes - a.minYes);

    return {
      widget: 'live_test',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      questions: questions.map((t) => ({ text: t })),
      rules,
    } satisfies LiveTestWidgetConfig;
  }

  if (widgetType === 'time_calc') {
    return {
      widget: 'time_calc',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      description: typeof obj.description === 'string' ? obj.description : undefined,
      weeksPerMonth: Number(obj.weeksPerMonth ?? 4.3) || 4.3,
      currency: typeof obj.currency === 'string' ? obj.currency : undefined,
      hourlyRate: typeof obj.hourlyRate === 'number' ? (obj.hourlyRate as number) : undefined,
    } satisfies TimeCalcWidgetConfig;
  }

  if (widgetType === 'checklist') {
    const raw = Array.isArray(obj.items) ? (obj.items as unknown[]) : [];
    const items: ChecklistItem[] = [];
    for (const entry of raw) {
      if (typeof entry === 'string') {
        const label = entry.trim();
        if (label) items.push({ label });
        continue;
      }
      const rec = asRecord(entry);
      if (!rec) continue;
      const label = typeof rec.label === 'string' ? rec.label.trim() : '';
      if (!label) continue;
      items.push({ label, help: typeof rec.help === 'string' ? rec.help : undefined });
    }
    if (!items.length) return null;

    const columnsRaw = Number((obj as Record<string, unknown>).columns ?? 2);
    const columns: 1 | 2 = columnsRaw === 1 ? 1 : 2;
    const ctaRec = asRecord((obj as Record<string, unknown>).cta);
    const cta = ctaRec && typeof ctaRec.label === 'string'
      ? { label: ctaRec.label, href: typeof ctaRec.href === 'string' ? ctaRec.href : undefined }
      : undefined;

    return {
      widget: 'checklist',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      items,
      columns,
      cta,
    } satisfies ChecklistWidgetConfig;
  }

  if (widgetType === 'plan_table') {
    const raw = Array.isArray(obj.rows) ? (obj.rows as unknown[]) : [];
    const rows: PlanTableRow[] = [];
    for (const entry of raw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const title = typeof rec.title === 'string' ? rec.title.trim() : '';
      if (!title) continue;
      const info = typeof rec.info === 'string' ? rec.info : undefined;
      const placeholder = typeof rec.placeholder === 'string' ? rec.placeholder : undefined;
      const multiline = Boolean(rec.multiline ?? true);
      rows.push({ title, info, placeholder, multiline });
    }
    if (!rows.length) return null;
    return { widget: 'plan_table', title: typeof obj.title === 'string' ? obj.title : undefined, rows, alias: typeof (obj as Record<string, unknown>).alias === 'string' ? ((obj as Record<string, unknown>).alias as string) : undefined } satisfies PlanTableWidgetConfig;
  }

  if (widgetType === 'single_choice') {
    const raw = Array.isArray(obj.options) ? (obj.options as unknown[]) : [];
    const options: SingleChoiceOption[] = [];
    for (const entry of raw) {
      if (typeof entry === 'string') {
        const label = entry.trim();
        if (label) options.push({ label });
        continue;
      }
      const rec = asRecord(entry);
      if (!rec) continue;
      const label = typeof rec.label === 'string' ? rec.label.trim() : '';
      if (!label) continue;
      options.push({
        label,
        description: typeof rec.description === 'string' ? rec.description : undefined,
        value: typeof rec.value === 'string' ? rec.value : undefined,
      });
    }
    if (!options.length) return null;
    const defaultIndex = Number((obj as Record<string, unknown>).defaultIndex ?? NaN);
    return {
      widget: 'single_choice',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      question: typeof obj.question === 'string' ? obj.question : undefined,
      options,
      defaultIndex: Number.isFinite(defaultIndex) ? defaultIndex : undefined,
    } satisfies SingleChoiceWidgetConfig;
  }

  if (widgetType === 'simple_checklist') {
    const raw = Array.isArray(obj.items) ? (obj.items as unknown[]) : [];
    const items: SimpleChecklistItem[] = [];
    for (const entry of raw) {
      if (typeof entry === 'string') {
        const text = entry.trim();
        if (text) items.push({ text });
        continue;
      }
      const rec = asRecord(entry);
      if (!rec) continue;
      const text = typeof rec.text === 'string' ? rec.text.trim() : '';
      if (!text) continue;
      const heading = Boolean((rec as { heading?: unknown }).heading);
      items.push({ text, heading });
    }
    if (!items.length) return null;
    return {
      widget: 'simple_checklist',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      items,
      showBoxes: Boolean((obj as Record<string, unknown>).showBoxes),
    } satisfies SimpleChecklistWidgetConfig;
  }

  if (widgetType === 'affirmation_check') {
    const raw = Array.isArray(obj.items) ? (obj.items as unknown[]) : [];
    const items: { test: string; question: string }[] = [];
    for (const entry of raw) {
      const rec = asRecord(entry);
      if (!rec) continue;
      const test = typeof rec.test === 'string' ? rec.test.trim() : '';
      const question = typeof rec.question === 'string' ? rec.question.trim() : '';
      if (!test || !question) continue;
      items.push({ test, question });
    }
    if (!items.length) return null;
    return {
      widget: 'affirmation_check',
      title: typeof obj.title === 'string' ? obj.title : undefined,
      items,
      showNotes: Boolean((obj as Record<string, unknown>).showNotes ?? true),
    } as AffirmationCheckWidgetConfig;
  }

  if (widgetType === 'plan_prompt') {
    const alias = String((obj as Record<string, unknown>).sourceAlias ?? '').trim();
    if (!alias) return null;
    return {
      widget: 'plan_prompt',
      title: typeof (obj as Record<string, unknown>).title === 'string' ? ((obj as Record<string, unknown>).title as string) : undefined,
      sourceAlias: alias,
    } satisfies PlanPromptWidgetConfig;
  }

  return null;
}

export function renderTemplate(template: string, values: Record<string, string>): string {
  const replaceValue = (key: string) => {
    const value = values[key];
    if (value === undefined || value === null || String(value).trim() === '') {
      return null;
    }
    return value;
  };

  let output = template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => {
    const replacement = replaceValue(key);
    return replacement ?? `{{${key}}}`;
  });

  output = output.replace(/(?<!{){\s*([\w.-]+)\s*}(?!})/g, (_, key: string) => {
    const replacement = replaceValue(key);
    return replacement ?? `{${key}}`;
  });

  return output;
}
