import type { RenderJobPayload } from '@/lib/render-dispatch/types';

export const renderQueue = null;

export function startRenderWorker() {
  throw new Error('BullMQ render workers are not available in Cloudflare app builds.');
}

export async function addRenderJob(_: RenderJobPayload): Promise<string> {
  throw new Error('BullMQ render dispatch is not available in Cloudflare app builds.');
}
