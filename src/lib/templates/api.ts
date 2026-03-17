import { Prisma } from '@prisma/client';

export interface TemplateRouteContext {
  params: Promise<{ id: string }>;
}

export const templateListSelect = {
  id: true,
  creatorId: true,
  title: true,
  description: true,
  thumbnailUrl: true,
  category: true,
  tags: true,
  priceCents: true,
  downloads: true,
  ratingAvg: true,
  status: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  creator: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
} satisfies Prisma.TemplateSelect;

export const templateDetailSelect = {
  ...templateListSelect,
  vidscript: true,
  placeholders: true,
  defaultValues: true,
} satisfies Prisma.TemplateSelect;

export function parseTemplateId(id: string): number | null {
  const templateId = parseInt(id, 10);

  if (Number.isNaN(templateId)) {
    return null;
  }

  return templateId;
}
