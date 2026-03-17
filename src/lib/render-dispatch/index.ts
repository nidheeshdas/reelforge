import prisma from '@/lib/db/prisma';
import { refundRenderCredit } from '@/lib/billing/ledger';
import { sendRenderFailureEmail } from '@/lib/email';
import type { RenderDispatchMode, RenderJobPayload } from '@/lib/render-dispatch/types';

interface QueueBindingLike {
  send(message: unknown, options?: Record<string, unknown>): Promise<void>;
}

interface CloudflareQueueContext {
  env: {
    RENDER_QUEUE?: QueueBindingLike;
  };
}

interface DispatchResult {
  mode: RenderDispatchMode;
  queued: boolean;
  jobId?: string;
}

function getRenderDispatchMode(): RenderDispatchMode {
  const mode = process.env.RENDER_DISPATCH_MODE;

  if (mode === 'bullmq' || mode === 'cloudflare-queue') {
    return mode;
  }

  return 'inline';
}

export async function dispatchRenderJob(payload: RenderJobPayload): Promise<DispatchResult> {
  const mode = getRenderDispatchMode();

  if (mode === 'cloudflare-queue') {
    await dispatchToCloudflareQueue(payload);
    return { mode, queued: true };
  }

  if (mode === 'bullmq') {
    const jobId = await dispatchToBullMQ(payload);
    return { mode, queued: true, jobId };
  }

  void runInlineRender(payload);
  return { mode: 'inline', queued: false };
}

async function dispatchToCloudflareQueue(payload: RenderJobPayload): Promise<void> {
  const { getCloudflareContext } = await import('@opennextjs/cloudflare');
  const cloudflare = await getCloudflareContext({ async: true }) as CloudflareQueueContext;
  const queue = cloudflare.env.RENDER_QUEUE;

  if (!queue) {
    throw new Error('RENDER_QUEUE binding is not configured.');
  }

  await queue.send(payload, { contentType: 'json' });
}

async function dispatchToBullMQ(payload: RenderJobPayload): Promise<string> {
  const { addRenderJob } = await import('@/lib/queue');
  return addRenderJob(payload);
}

async function runInlineRender(payload: RenderJobPayload): Promise<void> {
  try {
    await prisma.render.update({
      where: { id: payload.renderId },
      data: {
        status: 'processing',
        progress: 1,
        errorMessage: null,
      },
    });

    const [{ renderHeadlessComposition }, { resolveRenderResolution }] = await Promise.all([
      import('@/render/webgl-renderer'),
      import('@/render/render-config'),
    ]);

    const outputPath = await renderHeadlessComposition({
      renderId: payload.renderId,
      vidscript: payload.vidscript,
      resolution: resolveRenderResolution(payload.resolution).resolution,
      baseUrl: payload.baseUrl,
      onProgress: async (progress) => {
        try {
          await prisma.render.update({
            where: { id: payload.renderId },
            data: {
              progress: Math.min(progress, 99),
              status: 'processing',
            },
          });
        } catch (updateError) {
          console.error('Failed to update render progress:', updateError);
        }
      },
    });

    await prisma.render.update({
      where: { id: payload.renderId },
      data: {
        status: 'completed',
        progress: 100,
        outputPath,
        errorMessage: null,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Render failed:', error);

    await prisma.render.update({
      where: { id: payload.renderId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    const refund = await refundRenderCredit(
      payload.renderId,
      error instanceof Error ? error.message : 'Unknown error',
    );

    if (refund?.refunded && refund.email) {
      void sendRenderFailureEmail({
        to: refund.email,
        name: refund.name,
        renderId: payload.renderId,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        refundedCredits: refund.amount,
        balance: refund.balance,
      }).catch((emailError) => {
        console.error('Render failure email failed:', emailError);
      });
    }
  }
}
