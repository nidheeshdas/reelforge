import type { Prisma } from '@prisma/client';

export const PUBLIC_TEMPLATE_MAX_PRICE_CENTS = 0;

export function getPublicTemplateWhere(): Prisma.TemplateWhereInput {
  return {
    status: 'public',
    priceCents: PUBLIC_TEMPLATE_MAX_PRICE_CENTS,
  };
}

export function getPublicTemplatePublishError(priceCents: number): string | null {
  if (priceCents > PUBLIC_TEMPLATE_MAX_PRICE_CENTS) {
    return 'Public templates must be free in the current ReelForge launch slice. Remove the price before publishing.';
  }

  return null;
}

export function isTemplatePubliclyAccessible(priceCents: number, status: string) {
  return status === 'public' && priceCents <= PUBLIC_TEMPLATE_MAX_PRICE_CENTS;
}
