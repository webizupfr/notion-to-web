import { load } from 'js-yaml';
import type { ZodSchema } from 'zod';

type ParseResult<T> = { data: T | null; error?: string };

function parseYaml<T>(input: string | null | undefined, schema: ZodSchema<T>): ParseResult<T> {
  if (!input) return { data: null };
  try {
    const raw = load(input);
    if (!raw || typeof raw !== 'object') return { data: null };
    const parsed = schema.parse(raw);
    return { data: parsed };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { data: null, error: message };
  }
}

export { parseYaml };
