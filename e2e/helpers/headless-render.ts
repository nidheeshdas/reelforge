import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { renderHeadlessComposition } from '../../src/render/webgl-renderer';
import type { WebGLRenderOptions } from '../../src/render/webgl-renderer';

const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

export interface ProbedMp4Metadata {
  codec: string;
  width: number;
  height: number;
  pixFmt: string;
  duration: number | null;
}

export interface HeadlessRenderArtifact extends ProbedMp4Metadata {
  renderId: number;
  outputUrl: string;
  outputPath: string;
  size: number;
}

function createRenderId(): number {
  return Date.now() + Math.floor(Math.random() * 1_000_000);
}

function resolveOutputPath(outputUrl: string): string {
  return path.join(process.cwd(), 'public', outputUrl.replace(/^\/+/, ''));
}

function parseDuration(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

async function runCommand(command: string, args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      const stdout = Buffer.concat(stdoutChunks);
      const stderr = Buffer.concat(stderrChunks).toString();

      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(new Error(`${command} exited with code ${code}: ${stderr.slice(-500)}`));
    });
  });
}

export async function probeOutputMp4(filePath: string): Promise<ProbedMp4Metadata> {
  const { stdout } = await runCommand(FFPROBE_PATH, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=codec_name,width,height,pix_fmt:format=duration',
    '-of',
    'json',
    filePath,
  ]);

  const parsed = JSON.parse(stdout.toString()) as {
    streams?: Array<{
      codec_name?: string;
      width?: number;
      height?: number;
      pix_fmt?: string;
    }>;
    format?: {
      duration?: number | string;
    };
  };

  const stream = parsed.streams?.[0];
  if (!stream?.codec_name || !stream.width || !stream.height || !stream.pix_fmt) {
    throw new Error(`Unable to read MP4 metadata for ${filePath}`);
  }

  return {
    codec: stream.codec_name,
    width: stream.width,
    height: stream.height,
    pixFmt: stream.pix_fmt,
    duration: parseDuration(parsed.format?.duration),
  };
}

export async function cleanupHeadlessRender(output: Pick<HeadlessRenderArtifact, 'outputPath'> | string): Promise<void> {
  const outputPath = typeof output === 'string' ? output : output.outputPath;

  try {
    await fs.unlink(outputPath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code !== 'ENOENT') {
      throw error;
    }
  }
}

export async function renderHeadlessForTest(
  options: Omit<WebGLRenderOptions, 'renderId'>,
): Promise<HeadlessRenderArtifact> {
  const renderId = createRenderId();
  let outputUrl: string | null = null;

  try {
    outputUrl = await renderHeadlessComposition({
      ...options,
      renderId,
    });
    const outputPath = resolveOutputPath(outputUrl);
    const [metadata, stats] = await Promise.all([
      probeOutputMp4(outputPath),
      fs.stat(outputPath),
    ]);

    return {
      renderId,
      outputUrl,
      outputPath,
      size: stats.size,
      ...metadata,
    };
  } catch (error) {
    if (outputUrl) {
      await cleanupHeadlessRender(resolveOutputPath(outputUrl));
    }

    throw error;
  }
}

export async function withHeadlessRender<T>(
  options: Omit<WebGLRenderOptions, 'renderId'>,
  callback: (artifact: HeadlessRenderArtifact) => Promise<T> | T,
): Promise<T> {
  let artifact: HeadlessRenderArtifact | null = null;

  try {
    artifact = await renderHeadlessForTest(options);
    return await callback(artifact);
  } finally {
    if (artifact) {
      await cleanupHeadlessRender(artifact);
    }
  }
}
