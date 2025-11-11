import { z } from 'zod';

const colorRegex = /^[a-z0-9_-]+$/i;

export const HubMetaSchema = z
  .object({
    layout: z.enum(['timeline', 'sections']).optional(),
    color_theme: z.string().regex(colorRegex).optional(),
    show_progress: z.boolean().optional(),
    unlock_strategy: z.enum(['cohort', 'none']).optional(),
    header_variant: z.enum(['default', 'compact']).optional(),
  })
  .strict()
  .catchall(z.unknown());

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

export const WorkshopMetaSchema = z
  .object({
    source: z.string().optional(),
    derived_from: z.string().optional(),
    layout: z.enum(['grid', 'list']).optional(),
    color_theme: z.string().regex(colorRegex).optional(),
    show_progress: z.boolean().optional(),
    unlock_strategy: z.enum(['none']).optional(),
    display_header: z.boolean().optional(),
    print_ready: z.boolean().optional(),
  })
  .strict()
  .catchall(z.unknown());

export const SprintMetaSchema = z
  .object({
    color_theme: z.string().regex(colorRegex).optional(),
    layout: z.enum(['timeline', 'grid']).optional(),
    mode: z.enum(['simple', 'team']).optional(),
    show_progress: z.boolean().optional(),
    timezone: z.string().optional(),
    unlock_strategy: z.enum(['relative', 'absolute', 'none']).optional(),
  })
  .strict()
  .catchall(z.unknown());

const UnlockSchema = z
  .object({
    mode: z.enum(['absolute', 'relative', 'none']).optional(),
    at: z.string().optional(),
    offsetDays: z.number().optional(),
    time: z.string().optional(),
  })
  .partial()
  .catchall(z.unknown());

export const ModuleMetaSchema = z
  .object({
    unlock: UnlockSchema.optional(),
    lock_banner: z.string().optional(),
  })
  .strict()
  .catchall(z.unknown());

export type HubMeta = z.infer<typeof HubMetaSchema>;
export type DayMeta = z.infer<typeof DayMetaSchema>;
export type CohortMeta = z.infer<typeof CohortMetaSchema>;
export type WorkshopMeta = z.infer<typeof WorkshopMetaSchema>;
export type SprintMeta = z.infer<typeof SprintMetaSchema>;
export type ModuleMeta = z.infer<typeof ModuleMetaSchema>;
