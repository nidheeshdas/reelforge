export type CreditPack = {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  description: string;
  featured?: boolean;
};

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter-10',
    name: 'Starter Pack',
    credits: 10,
    priceCents: 1200,
    description: 'A quick top-up for testing exports and first projects.',
  },
  {
    id: 'creator-25',
    name: 'Creator Pack',
    credits: 25,
    priceCents: 2500,
    description: 'The best fit for regular short-form production runs.',
    featured: true,
  },
  {
    id: 'studio-60',
    name: 'Studio Pack',
    credits: 60,
    priceCents: 5400,
    description: 'Built for teams iterating on multiple client-ready exports.',
  },
];

export const RENDER_CREDIT_COST = 1;

export function getCreditPack(packId: string) {
  return CREDIT_PACKS.find((pack) => pack.id === packId) ?? null;
}
