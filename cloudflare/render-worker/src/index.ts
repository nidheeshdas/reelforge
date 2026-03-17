import { createRenderContainerId, isRenderJobPayload, type RenderJobPayload } from '../../../src/lib/render-dispatch/types';
import { RenderContainer } from './render-container';

interface QueueMessageLike {
  id: string;
  body: unknown;
  attempts: number;
  ack(): void;
  retry(): void;
}

interface QueueBatchLike {
  messages: QueueMessageLike[];
}

interface RenderControlEnv {
  RENDER_CONTAINER: {
    getByName(name: string): {
      fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
    };
  };
  REELFORGE_INTERNAL_TOKEN?: string;
}

function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init?.headers ?? {}),
    },
  });
}

async function forwardJobToContainer(env: RenderControlEnv, payload: RenderJobPayload): Promise<Response> {
  const containerId = createRenderContainerId(payload.renderId);
  const container = env.RENDER_CONTAINER.getByName(containerId);

  return container.fetch('http://container/jobs/render', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-reelforge-internal-token': env.REELFORGE_INTERNAL_TOKEN ?? '',
    },
    body: JSON.stringify(payload),
  });
}

export { RenderContainer };

const renderControlWorker = {
  async fetch(request: Request, env: RenderControlEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        worker: 'reelforge-render-control',
        queueConsumer: 'reelforge-render-jobs',
        containerClass: 'RenderContainer',
        note: 'Container execution is scaffolded. Final render completion callbacks remain the next migration step.',
      });
    }

    if (url.pathname === '/queue/dispatch' && request.method === 'POST') {
      const payload = await request.json();

      if (!isRenderJobPayload(payload)) {
        return json({ error: 'Invalid render job payload' }, { status: 400 });
      }

      const response = await forwardJobToContainer(env, payload);
      return json({
        accepted: response.ok,
        status: response.status,
        containerId: createRenderContainerId(payload.renderId),
      }, { status: response.ok ? 202 : 502 });
    }

    return json({ error: 'Not found' }, { status: 404 });
  },

  async queue(batch: QueueBatchLike, env: RenderControlEnv): Promise<void> {
    for (const message of batch.messages) {
      try {
        if (!isRenderJobPayload(message.body)) {
          console.error('Dropping invalid render queue payload', message.id);
          message.ack();
          continue;
        }

        const response = await forwardJobToContainer(env, message.body);

        if (!response.ok) {
          throw new Error(`Container dispatch failed with status ${response.status}`);
        }

        message.ack();
      } catch (error) {
        console.error('Render queue dispatch failed', {
          messageId: message.id,
          attempts: message.attempts,
          error,
        });
        message.retry();
      }
    }
  },
};

export default renderControlWorker;
