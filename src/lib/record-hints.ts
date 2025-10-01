import type { ExtendedRecordMap, Block } from 'notion-types';

export type ColumnHints = Record<string, { ratio?: number; widthPx?: number }>;
export type ImageHints = Record<string, { widthPx?: number; align?: 'left' | 'center' | 'right' }>;
export type ButtonHint = { label: string; url: string; style?: 'primary' | 'ghost' };

export type BlockHints = {
  columns: ColumnHints;
  images: ImageHints;
  buttons: Record<string, ButtonHint>;
};

const BUTTON_STYLE_MAP: Record<string, ButtonHint['style']> = {
  primary: 'primary',
  secondary: 'ghost',
  outline: 'ghost',
};

function normalizeRatio(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const num = parseFloat(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function getPlainText(prop: unknown): string | null {
  if (!prop) return null;
  if (Array.isArray(prop)) {
    return (
      prop
        .map((v) => {
          if (Array.isArray(v)) {
            const segment = v[0];
            return typeof segment === 'string' ? segment : '';
          }
          return '';
        })
        .join('')
        .trim() || null
    );
  }
  return null;
}

export function extractHints(recordMap: ExtendedRecordMap): BlockHints {
  const hints: BlockHints = { columns: {}, images: {}, buttons: {} };
  const blocks = recordMap.block || {};

  for (const blockId of Object.keys(blocks)) {
    const block = blocks[blockId]?.value as Block | undefined;
    if (!block) continue;
    const type = block.type;
    const format = (block as Block & { format?: Record<string, unknown> }).format || {};

    if (type === 'column_list') {
      console.log('[recordMap] column_list format', format);
    }

    if (type === 'column') {
      const ratio = normalizeRatio(format.column_ratio ?? format.ratio);
      const widthPx = normalizeRatio(format.column_width ?? format.width);
      if (ratio !== undefined || widthPx !== undefined) {
        hints.columns[blockId] = { ratio: ratio ?? undefined, widthPx: widthPx ?? undefined };
      }
    } else if (type === 'image') {
      const widthPx = normalizeRatio(
        format.block_width ?? format.block_width_px ?? format.width ?? format.column_width
      );
      const align = format.block_alignment ?? format.block_align ?? undefined;
      let normalizedAlign: 'left' | 'center' | 'right' | undefined;
      if (align === 'left' || align === 'right') normalizedAlign = align;
      else if (align === 'center') normalizedAlign = 'center';

      if (widthPx !== undefined || normalizedAlign) {
        hints.images[blockId] = {
          widthPx: widthPx ?? undefined,
          align: normalizedAlign,
        };
      }
    } else if ((type as string) === 'button' || ((type as string) === 'unsupported' && isButtonLike(format))) {
      const label = getPlainText((block as Block & { properties?: Record<string, unknown> }).properties?.title) ?? '';
      const buttonUrl = (format as { button_url?: unknown; button?: { url?: string } }).button_url;
      const secondaryUrl = (format as { button?: { url?: string } }).button?.url;
      const url = typeof buttonUrl === 'string' && buttonUrl.trim()
        ? buttonUrl.trim()
        : typeof secondaryUrl === 'string'
        ? secondaryUrl.trim()
        : '';
      if (label && url) {
        const styleRaw = String(
          (format as { button_style?: unknown; button?: { style?: string } }).button_style ??
            (format as { button?: { style?: string } }).button?.style ??
            ''
        ).toLowerCase();
        const style = BUTTON_STYLE_MAP[styleRaw] ?? 'primary';
        hints.buttons[blockId] = { label, url, style };
      }
    }
  }

  return hints;
}

function isButtonLike(format: Record<string, unknown> | undefined): boolean {
  if (!format) return false;
  const typed = format as {
    button_url?: unknown;
    button?: { url?: string };
    button_actions?: unknown;
  };
  const primary = typeof typed.button_url === 'string' ? typed.button_url.trim() : '';
  const nested = typeof typed.button?.url === 'string' ? typed.button.url.trim() : '';
  return Boolean(primary) || Boolean(nested) || typed.button_actions !== undefined;
}
