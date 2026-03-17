import { spawn } from 'child_process';
import { once } from 'events';
import * as fs from 'fs';
import { applyCompositionState, buildComposition } from '@/lib/preview/composition';
import { getRenderOutputPath, getRenderPublicPath } from '@/lib/storage/paths';
import { HeadlessRenderEngine } from '@/render/headless-render-engine';

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';

export interface WebGLRenderOptions {
  renderId: number;
  vidscript: string;
  resolution: { width: number; height: number };
  fps?: number;
  baseUrl?: string;
  onProgress?: (progress: number) => void | Promise<void>;
}

async function notifyProgress(
  onProgress: WebGLRenderOptions['onProgress'],
  progress: number,
): Promise<void> {
  if (!onProgress) {
    return;
  }

  await onProgress(progress);
}

async function encodeVideoStream(
  engine: HeadlessRenderEngine,
  vidscript: string,
  width: number,
  height: number,
  fps: number,
  outputPath: string,
  onProgress?: WebGLRenderOptions['onProgress'],
): Promise<void> {
  await notifyProgress(onProgress, 5);

  const composition = await buildComposition(engine, vidscript, width, height);
  const duration = Math.max(composition.duration, 1 / fps);
  const totalFrames = Math.max(1, Math.ceil(duration * fps));

  await notifyProgress(onProgress, 10);

  const ffmpegArgs = [
    '-y',
    '-f',
    'rawvideo',
    '-pix_fmt',
    'rgba',
    '-s:v',
    `${width}x${height}`,
    '-r',
    String(fps),
    '-i',
    'pipe:0',
    '-an',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    outputPath,
  ];

  const ffmpeg = spawn(FFMPEG_PATH, ffmpegArgs, {
    stdio: ['pipe', 'ignore', 'pipe'],
  });

  let stderr = '';
  ffmpeg.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  const completion = new Promise<void>((resolve, reject) => {
    ffmpeg.on('error', (error) => {
      reject(new Error(`Failed to start ffmpeg: ${error.message}`));
    });

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
    });
  });

  try {
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
      const time = Math.min(frameIndex / fps, Math.max(duration - 1 / fps, 0));
      applyCompositionState(engine, composition, time);
      const frameBuffer = await engine.renderFrame(time);

      if (!ffmpeg.stdin.write(frameBuffer)) {
        await once(ffmpeg.stdin, 'drain');
      }

      const renderProgress = 10 + Math.round(((frameIndex + 1) / totalFrames) * 88);
      await notifyProgress(onProgress, Math.min(renderProgress, 98));
    }

    ffmpeg.stdin.end();
    await completion;
    await notifyProgress(onProgress, 99);
  } catch (error) {
    ffmpeg.stdin.destroy();
    ffmpeg.kill();
    await completion.catch(() => undefined);
    throw error;
  }
}

export async function renderHeadlessComposition(options: WebGLRenderOptions): Promise<string> {
  const { renderId, vidscript, resolution, fps = 30, onProgress } = options;
  const { width, height } = resolution;
  const outputPath = getRenderOutputPath(renderId);

  const engine = new HeadlessRenderEngine(width, height);

  try {
    await encodeVideoStream(engine, vidscript, width, height, fps, outputPath, onProgress);
    return getRenderPublicPath(renderId);
  } catch (error) {
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    throw error;
  } finally {
    engine.dispose();
  }
}

export async function renderWithWebGL(options: WebGLRenderOptions): Promise<string> {
  return renderHeadlessComposition(options);
}
