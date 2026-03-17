export const RENDER_QUEUE_NAME = 'reelforge-render-jobs';
export const RENDER_QUEUE_DLQ_NAME = 'reelforge-render-jobs-dlq';

export type RenderDispatchMode = 'inline' | 'bullmq' | 'cloudflare-queue';

export interface RenderJobPayload {
  renderId: number;
  userId: number;
  vidscript: string;
  resolution: string;
  baseUrl: string;
  submittedAt: string;
}

export function createRenderJobPayload(input: Omit<RenderJobPayload, 'submittedAt'>): RenderJobPayload {
  return {
    ...input,
    submittedAt: new Date().toISOString(),
  };
}

export function createRenderContainerId(renderId: number): string {
  return `render-${renderId}`;
}

export function isRenderJobPayload(value: unknown): value is RenderJobPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<RenderJobPayload>;
  return (
    typeof payload.renderId === 'number' &&
    typeof payload.userId === 'number' &&
    typeof payload.vidscript === 'string' &&
    typeof payload.resolution === 'string' &&
    typeof payload.baseUrl === 'string' &&
    typeof payload.submittedAt === 'string'
  );
}
