import { Queue, Worker, Job } from 'bullmq';
import { renderHeadlessComposition } from '@/render/webgl-renderer';
import { resolveRenderResolution } from '@/render/render-config';
import type { RenderJobPayload } from '@/lib/render-dispatch/types';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const renderQueue = new Queue<RenderJobPayload>('video-render', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export function startRenderWorker() {
  const worker = new Worker<RenderJobPayload>(
    'video-render',
    async (job: Job<RenderJobPayload>) => {
      const { renderId, vidscript, resolution, userId, baseUrl } = job.data;

      console.log(`Starting render ${renderId} for user ${userId}`);

      try {
        await renderHeadlessComposition({
          renderId,
          vidscript,
          resolution: resolveRenderResolution(resolution).resolution,
          baseUrl,
          onProgress: (progress: number) => {
            job.updateProgress(progress);
          },
        });

        return { success: true };
      } catch (error) {
        console.error(`Render ${renderId} failed:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

export async function addRenderJob(data: RenderJobPayload): Promise<string> {
  const job = await renderQueue.add('render', data);
  return job.id!;
}
