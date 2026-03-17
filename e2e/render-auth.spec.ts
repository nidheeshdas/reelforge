import { expect, test } from '@playwright/test';
import type { APIRequestContext, Browser } from '@playwright/test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../src/lib/db/prisma';

const SAMPLE_VIDSCRIPT = `input hero_video = "hero.mp4"
[0s - 3s] = hero_video.Trim(0, 3)
[0.25s - end] = text "Render auth coverage", style: title, position: center
output to "render-auth-smoke.mp4", resolution: 1080x1920`;

async function registerUser(email: string, password: string, request: APIRequestContext) {
  const response = await request.post('/api/auth/register', {
    data: {
      name: 'Render Auth Test User',
      email,
      password,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function signInContext(browser: Browser, email: string, password: string) {
  const context = await browser.newContext({
    baseURL: 'http://localhost:3000',
  });

  const csrfResponse = await context.request.get('/api/auth/csrf');
  expect(csrfResponse.ok()).toBeTruthy();

  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

  const signInResponse = await context.request.post('/api/auth/callback/credentials', {
    form: {
      csrfToken,
      email,
      password,
      callbackUrl: 'http://localhost:3000/account',
      json: 'true',
    },
  });

  expect(signInResponse.ok()).toBeTruthy();

  const sessionResponse = await context.request.get('/api/auth/session');
  const session = (await sessionResponse.json()) as { user?: { email?: string } };
  expect(session.user?.email).toBe(email);

  return context;
}

async function createCompletedRender(userId: number) {
  const renderDir = path.join(process.cwd(), 'public', 'renders');
  await mkdir(renderDir, { recursive: true });

  const filename = `render-auth-${userId}-${Date.now()}-${Math.round(Math.random() * 100000)}.mp4`;
  const absoluteFilePath = path.join(renderDir, filename);
  const relativeOutputPath = `/renders/${filename}`;

  await writeFile(absoluteFilePath, Buffer.from('fake-mp4-binary'));

  const render = await prisma.render.create({
    data: {
      userId,
      vidscript: SAMPLE_VIDSCRIPT,
      status: 'completed',
      progress: 100,
      resolution: '1080x1920',
      outputPath: relativeOutputPath,
      completedAt: new Date(),
    },
  });

  return {
    render,
    cleanup: () => rm(absoluteFilePath, { force: true }),
  };
}

async function createPendingRender(userId: number) {
  return prisma.render.create({
    data: {
      userId,
      vidscript: SAMPLE_VIDSCRIPT,
      status: 'pending',
      progress: 0,
      resolution: '1080x1920',
    },
  });
}

test.describe('Render API auth hardening', () => {
  test('rejects signed-out render creation, status, and download access', async ({ request }) => {
    const createResponse = await request.post('/api/render', {
      data: {
        vidscript: SAMPLE_VIDSCRIPT,
      },
    });
    expect(createResponse.status()).toBe(401);
    await expect(createResponse.json()).resolves.toEqual({ error: 'Unauthorized' });

    const statusResponse = await request.get('/api/render?id=999999999');
    expect(statusResponse.status()).toBe(401);
    await expect(statusResponse.json()).resolves.toEqual({ error: 'Unauthorized' });

    const downloadResponse = await request.get('/api/render/download?id=999999999');
    expect(downloadResponse.status()).toBe(401);
    await expect(downloadResponse.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  test('returns 404 for another user’s render status and download, while allowing the owner', async ({
    browser,
    request,
  }) => {
    const ownerEmail = `render-owner-${Date.now()}-${Math.round(Math.random() * 100000)}@example.com`;
    const viewerEmail = `render-viewer-${Date.now()}-${Math.round(Math.random() * 100000)}@example.com`;
    const password = 'supersecure123';

    await registerUser(ownerEmail, password, request);
    await registerUser(viewerEmail, password, request);

    const owner = await prisma.user.findUnique({
      where: { email: ownerEmail },
      select: { id: true },
    });
    const viewer = await prisma.user.findUnique({
      where: { email: viewerEmail },
      select: { id: true },
    });

    expect(owner?.id).toBeDefined();
    expect(viewer?.id).toBeDefined();

    const ownerContext = await signInContext(browser, ownerEmail, password);
    const viewerContext = await signInContext(browser, viewerEmail, password);

    const pendingRender = await createPendingRender(owner!.id);
    const completedRender = await createCompletedRender(owner!.id);

    try {
      const ownerStatusResponse = await ownerContext.request.get(`/api/render?id=${pendingRender.id}`);
      expect(ownerStatusResponse.ok()).toBeTruthy();
      await expect(ownerStatusResponse.json()).resolves.toMatchObject({
        id: pendingRender.id,
        status: 'pending',
        progress: 0,
        outputUrl: null,
        downloadUrl: null,
        error: null,
      });

      const viewerStatusResponse = await viewerContext.request.get(`/api/render?id=${pendingRender.id}`);
      expect(viewerStatusResponse.status()).toBe(404);
      await expect(viewerStatusResponse.json()).resolves.toEqual({ error: 'Render not found' });

      const ownerDownloadResponse = await ownerContext.request.get(
        `/api/render/download?id=${completedRender.render.id}`
      );
      expect(ownerDownloadResponse.ok()).toBeTruthy();
      expect(ownerDownloadResponse.headers()['content-type']).toBe('video/mp4');
      expect(ownerDownloadResponse.headers()['content-disposition']).toContain('attachment; filename=');

      const viewerDownloadResponse = await viewerContext.request.get(
        `/api/render/download?id=${completedRender.render.id}`
      );
      expect(viewerDownloadResponse.status()).toBe(404);
      await expect(viewerDownloadResponse.json()).resolves.toEqual({ error: 'Render not found' });
    } finally {
      await ownerContext.close();
      await viewerContext.close();
      await prisma.render.deleteMany({
        where: {
          id: {
            in: [pendingRender.id, completedRender.render.id],
          },
        },
      });
      await completedRender.cleanup();
    }
  });
});
