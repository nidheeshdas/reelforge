export const templateStatuses = ['draft', 'private', 'public', 'archived'] as const;

export type TemplateStatusValue = (typeof templateStatuses)[number];

export function isTemplateStatus(value: string): value is TemplateStatusValue {
  return templateStatuses.includes(value as TemplateStatusValue);
}

export function isPublicTemplateStatus(status: TemplateStatusValue): boolean {
  return status === 'public';
}
