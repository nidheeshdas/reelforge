import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

export interface WebGLRenderOptions {
  renderId: number;
  vidscript: string;
  resolution: { width: number; height: number };
  fps?: number;
  baseUrl?: string;
  onProgress?: (progress: number) => void;
}

async function captureFrames(
  baseUrl: string,
  vidscript: string,
  width: number,
  height: number,
  outputDir: string,
  duration: number,
  fps: number,
  onProgress?: (progress: number) => void
): Promise<string[]> {
  const playwright = await import('playwright');
  const browser = await playwright.chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--enable-webgl',
      '--enable-webgl2-compute-context',
      '--ignore-gpu-blocklist',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--mute-audio',
      '--no-first-run',
      '--safebrowsing-disable-auto-update',
    ],
  });

  const framePaths: string[] = [];

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.on('console', (msg) => {
      console.log(`[Render][browser:${msg.type()}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.error('[Render][browser:pageerror]', err);
    });

    const renderUrl = `${baseUrl}/render/preview?code=${encodeURIComponent(vidscript)}&width=${width}&height=${height}&renderId=${Date.now()}`;

    console.log(`[Render] Loading preview page: ${renderUrl}`);
    await page.goto(renderUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForTimeout(2000);

    const pageError = await page.evaluate(() => {
      const errorEl = document.querySelector('[data-error]');
      return errorEl ? errorEl.textContent : null;
    });

    if (pageError) {
      throw new Error(`Preview page error: ${pageError}`);
    }

    const canvasFound = await page.waitForFunction(
      () => {
        const canvases = document.querySelectorAll('#render-canvas canvas');
        const canvas = canvases.length > 0 ? canvases[canvases.length - 1] : null;
        return canvas !== null;
      },
      { timeout: 30000 }
    ).then(() => true).catch(() => false);

    if (!canvasFound) {
      const pageContent = await page.content();
      console.log('[Render] Page content:', pageContent.slice(0, 2000));
      throw new Error('Canvas element not found on render preview page. The WebGL context may not have initialized.');
    }

    await page.waitForFunction(
      () => {
        const ready = document.querySelector('[data-ready]');
        return ready?.getAttribute('data-ready') === 'true';
      },
      { timeout: 30000 }
    ).catch(() => {
      console.log('[Render] Timeout waiting for ready state, proceeding anyway');
    });

    await page.waitForTimeout(500);

    const diagnostics = await page.evaluate(() => {
      const canvas = document.querySelector('#render-canvas canvas') as HTMLCanvasElement | null;
      const video = document.querySelector('video') as HTMLVideoElement | null;
      let glInfo: { version: string | null; vendor: string | null; renderer: string | null } | null = null;
      if (canvas) {
        const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
        if (gl) {
          const ext = gl.getExtension('WEBGL_debug_renderer_info');
          glInfo = {
            version: gl.getParameter(gl.VERSION) as string,
            vendor: ext ? (gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) as string) : null,
            renderer: ext ? (gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : null,
          };
        }
      }
      return {
        hasCanvas: !!canvas,
        canvasSize: canvas ? { width: canvas.width, height: canvas.height } : null,
        hasVideo: !!video,
        video: video
          ? {
              currentSrc: video.currentSrc,
              readyState: video.readyState,
              networkState: video.networkState,
              currentTime: video.currentTime,
              duration: Number.isFinite(video.duration) ? video.duration : null,
              paused: video.paused,
            }
          : null,
        glInfo,
      };
    });
    console.log('[Render] Preview diagnostics:', diagnostics);

    const pageDuration = await page.evaluate(() => {
      const durationEl = document.querySelector('[data-duration]');
      return durationEl ? parseFloat(durationEl.getAttribute('data-duration') || '10') : 10;
    });

    const actualDuration = pageDuration || duration;
    const totalFrames = Math.ceil(actualDuration * fps);

    console.log(`[Render] Capturing ${totalFrames} frames for ${actualDuration}s duration`);

      for (let frame = 0; frame < totalFrames; frame++) {
        const time = frame / fps;

        await page.evaluate(async (t) => {
          const previewApi = (window as Window & {
            __REELFORGE_RENDER_PREVIEW__?: { seekTo: (time: number) => Promise<{ time: number }> };
          }).__REELFORGE_RENDER_PREVIEW__;

          if (previewApi?.seekTo) {
            await previewApi.seekTo(t);
          } else {
            const seekInput = document.querySelector('input[type="range"]') as HTMLInputElement | null;
            if (seekInput) {
              seekInput.value = String(t);
              seekInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          const canvases = document.querySelectorAll('#render-canvas canvas');
          const canvas = (canvases.length > 0 ? canvases[canvases.length - 1] : null) as HTMLCanvasElement | null;
          if (canvas) {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
              gl.finish();
            }
          }
        }, time);

        await page.waitForTimeout(50);

        if (frame === 0 || frame === Math.floor(totalFrames / 2)) {
          const frameDiagnostics = await page.evaluate(() => {
            const video = document.querySelector('video') as HTMLVideoElement | null;
            return video
              ? {
                  readyState: video.readyState,
                  currentTime: video.currentTime,
                  paused: video.paused,
                  ended: video.ended,
                }
              : null;
          });
          console.log(`[Render] Frame ${frame} diagnostics:`, frameDiagnostics);
        }

        const canvas = await page.$('#render-canvas canvas:last-of-type');
        if (canvas) {
          const framePath = path.join(outputDir, `frame_${String(frame).padStart(5, '0')}.png`);
          await canvas.screenshot({ path: framePath, type: 'png' });
          framePaths.push(framePath);
        }

        const progress = Math.round(((frame + 1) / totalFrames) * 80);
        onProgress?.(Math.min(progress, 80));
      }

    console.log(`[Render] Captured ${framePaths.length} frames`);
    return framePaths;
  } finally {
    await browser.close();
  }
}

function encodeVideo(
  frameDir: string,
  outputPath: string,
  fps: number = 30,
  totalFrames?: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', String(fps),
      '-i', path.join(frameDir, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outputPath,
    ];

    console.log(`[Render] FFmpeg command: ${FFMPEG_PATH} ${args.join(' ')}`);

    const ffmpeg = spawn(FFMPEG_PATH, args);
    let stderr = '';

    ffmpeg.stderr.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;

      const frameMatches = Array.from(chunk.matchAll(/frame=\s*(\d+)/g));
      const lastFrameMatch = frameMatches.at(-1);
      if (lastFrameMatch) {
        const encodedFrames = Number.parseInt(lastFrameMatch[1], 10);
        const encodeProgress = totalFrames && totalFrames > 0
          ? Math.round((encodedFrames / totalFrames) * 19)
          : Math.min(19, Math.round(encodedFrames / 10));
        onProgress?.(80 + Math.min(19, encodeProgress));
      }
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        onProgress?.(99);
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to run ffmpeg: ${err.message}`));
    });
  });
}

function cleanupFrames(renderId: number): void {
  const frameDir = path.join(process.cwd(), 'public', 'renders', String(renderId), 'frames');
  if (fs.existsSync(frameDir)) {
    const files = fs.readdirSync(frameDir);
    for (const file of files) {
      if (file.endsWith('.png')) {
        fs.unlinkSync(path.join(frameDir, file));
      }
    }
    try {
      fs.rmdirSync(frameDir);
      const parentDir = path.join(process.cwd(), 'public', 'renders', String(renderId));
      if (fs.existsSync(parentDir)) {
        fs.rmdirSync(parentDir);
      }
    } catch {}
  }
}

export async function renderWithWebGL(options: WebGLRenderOptions): Promise<string> {
  const { renderId, vidscript, resolution, fps = 30, baseUrl: providedBaseUrl, onProgress } = options;
  const { width, height } = resolution;

  console.log(`[Render] Starting render ${renderId} with resolution ${width}x${height}`);

  const outputDir = path.join(process.cwd(), 'public', 'renders');
  const frameDir = path.join(outputDir, String(renderId), 'frames');

  if (!fs.existsSync(frameDir)) {
    fs.mkdirSync(frameDir, { recursive: true });
  }

  const baseUrl = providedBaseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    onProgress?.(2);

    console.log(`[Render] Checking if server is running at ${baseUrl}`);
    
    let serverAvailable = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(`${baseUrl}/render/preview`, { method: 'HEAD' });
        if (response.ok) {
          serverAvailable = true;
          break;
        }
      } catch {}
      console.log(`[Render] Server not available, attempt ${attempt + 1}/5`);
      await new Promise(r => setTimeout(r, 2000));
    }

    if (!serverAvailable) {
      throw new Error(`Development server not running at ${baseUrl}. Please start the dev server with 'npm run dev' and try again.`);
    }

    onProgress?.(5);

    const framePaths = await captureFrames(
      baseUrl,
      vidscript,
      width,
      height,
      frameDir,
      10,
      fps,
      onProgress
    );

    if (framePaths.length === 0) {
      throw new Error('No frames were captured. Check if the preview page renders correctly.');
    }

    onProgress?.(85);

    const outputPath = path.join(outputDir, `${renderId}.mp4`);

    await encodeVideo(frameDir, outputPath, fps, framePaths.length, onProgress);

    cleanupFrames(renderId);

    console.log(`[Render] Completed: /renders/${renderId}.mp4`);
    return `/renders/${renderId}.mp4`;
  } catch (error) {
    console.error(`[Render] Failed:`, error);
    cleanupFrames(renderId);
    throw error;
  }
}
