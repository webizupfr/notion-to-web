import { z } from 'zod';

const colorRegex = /^[a-z0-9_-]+$/i;

export const DayMetaSchema = z
  .object({
    icon: z.string().max(4).optional(),
    color: z.string().regex(colorRegex).optional(),
    layout: z.enum(['list', 'grid']).optional(),
    callout: z.string().optional(),
  })
  .strict()
  .catchall(z.unknown());

export const CohortMetaSchema = z
  .object({
    access_banner: z.boolean().optional(),
    reminder_note: z.string().optional(),
  })
  .strict()
  .catchall(z.unknown());

export type DayMeta = z.infer<typeof DayMetaSchema>;
export type CohortMeta = z.infer<typeof CohortMetaSchema>;
