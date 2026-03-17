import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { isPublicTemplateStatus, templateStatuses, type TemplateStatusValue } from '@/lib/templates/status';

const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ])
);

const nullableTrimmedString = z.string().trim().max(255).optional();
const optionalThumbnailUrlSchema = z
  .string()
  .trim()
  .refine(
    (value) => value.length === 0 || value.startsWith('/') || /^https?:\/\//.test(value),
    'Thumbnail URL must be an absolute URL or app-relative path'
  )
  .optional();

const templateStatusSchema = z.enum(templateStatuses);

export const createTemplateSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255),
  description: nullableTrimmedString,
  category: nullableTrimmedString,
  tags: z.array(z.string().trim().min(1).max(50)).max(25).optional(),
  vidscript: z.string().min(1, 'Vidscript is required'),
  placeholders: jsonValueSchema.optional(),
  defaultValues: jsonValueSchema.optional(),
  thumbnailUrl: optionalThumbnailUrlSchema,
  priceCents: z.number().int().min(0).optional(),
  status: templateStatusSchema.optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field must be provided'
);

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

export function normalizeTemplateText(value?: string): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeTemplateThumbnailUrl(value?: string): string | null {
  if (value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getPublishedAtForStatus(
  status: TemplateStatusValue,
  currentPublishedAt?: Date | null
): Date | undefined {
  if (isPublicTemplateStatus(status) && !currentPublishedAt) {
    return new Date();
  }

  return undefined;
}

export function getTemplateLifecycleUpdate(
  status: TemplateStatusValue,
  currentPublishedAt?: Date | null
): Pick<Prisma.TemplateUpdateInput, 'status' | 'publishedAt'> {
  return {
    status,
    publishedAt: getPublishedAtForStatus(status, currentPublishedAt) ?? currentPublishedAt ?? null,
  };
}
