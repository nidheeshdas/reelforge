import { Queue, Worker, Job } from 'bullmq';
import { renderHeadlessComposition } from '../../render/webgl-renderer';

export interface RenderJobData {
  renderId: number;
  vidscript: string;
  resolution: string;
  userId: number;
}

const RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '1080x1920': { width: 1080, height: 1920 },
  '1080x1080': { width: 1080, height: 1080 },
  '1920x1080': { width: 1920, height: 1080 },
};

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export const renderQueue = new Queue<RenderJobData>('video-render', {
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
  const worker = new Worker<RenderJobData>(
    'video-render',
    async (job: Job<RenderJobData>) => {
      const { renderId, vidscript, resolution, userId } = job.data;
      
      console.log(`Starting render ${renderId} for user ${userId}`);
      
      try {
        await renderHeadlessComposition({
          renderId,
          vidscript,
          resolution: RESOLUTIONS[resolution] || RESOLUTIONS['1080x1920'],
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

export async function addRenderJob(data: RenderJobData): Promise<string> {
  const job = await renderQueue.add('render', data);
  return job.id!;
}
