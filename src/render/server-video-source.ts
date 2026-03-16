import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const FFMPEG_PATH = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE_PATH = process.env.FFPROBE_PATH || 'ffprobe';

export interface ServerVideoMetadata {
  duration: number | null;
  videoWidth: number;
  videoHeight: number;
  frameRate: number | null;
  inputPath: string;
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

function resolveLocalAssetPath(source: string): string | null {
  const sanitizedSource = source.split(/[?#]/, 1)[0].trim();

  if (!sanitizedSource) {
    return null;
  }

  if (path.isAbsolute(sanitizedSource) && fs.existsSync(sanitizedSource)) {
    return sanitizedSource;
  }

  const publicRelative = sanitizedSource.replace(/^\/+/, '').replace(/^public\//, '');
  const publicPath = path.join(process.cwd(), 'public', publicRelative);
  if (fs.existsSync(publicPath)) {
    return publicPath;
  }

  const cwdRelative = sanitizedSource.replace(/^\.\//, '');
  const cwdPath = path.join(process.cwd(), cwdRelative);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  return null;
}

function parseFrameRate(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || normalized === '0/0') {
    return null;
  }

  const parts = normalized.split('/');
  if (parts.length === 2) {
    const numerator = Number.parseFloat(parts[0]);
    const denominator = Number.parseFloat(parts[1]);
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0) {
      const rate = numerator / denominator;
      return rate > 0 ? rate : null;
    }
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function resolveVideoInputPath(source: string): string {
  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  const resolvedPath = resolveLocalAssetPath(source);
  if (resolvedPath) {
    return resolvedPath;
  }

  throw new Error(`Video input not found: ${source}`);
}

function runCommand(command: string, args: string[]): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
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

export async function probeVideoMetadata(source: string): Promise<ServerVideoMetadata> {
  const inputPath = resolveVideoInputPath(source);
  const { stdout, stderr } = await runCommand(FFPROBE_PATH, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,duration,avg_frame_rate,r_frame_rate:format=duration',
    '-of',
    'json',
    inputPath,
  ]).catch((probeError) => {
    throw new Error(
      `Failed to probe video metadata for ${source}: ${probeError instanceof Error ? probeError.message : String(probeError)}`
    );
  });

  const parsed = JSON.parse(stdout.toString()) as {
    streams?: Array<{
      width?: number;
      height?: number;
      duration?: number | string;
      avg_frame_rate?: string;
      r_frame_rate?: string;
    }>;
    format?: { duration?: number | string };
  };

  const stream = parsed.streams?.[0];
  const width = stream?.width ?? 0;
  const height = stream?.height ?? 0;
  const duration = parseDuration(stream?.duration ?? parsed.format?.duration);
  const frameRate = parseFrameRate(stream?.avg_frame_rate) ?? parseFrameRate(stream?.r_frame_rate);

  if (!width || !height) {
    throw new Error(`Unable to determine dimensions for ${source}. ${stderr.slice(-300)}`);
  }

  return {
    duration,
    videoWidth: width,
    videoHeight: height,
    frameRate,
    inputPath,
  };
}

export class ServerVideoFrameSource {
  private lastFrameKey: string | null = null;
  private lastFrame: Buffer | null = null;
  private readonly metadata: ServerVideoMetadata;

  constructor(metadata: ServerVideoMetadata) {
    this.metadata = metadata;
  }

  getMetadata(): ServerVideoMetadata {
    return this.metadata;
  }

  private getFrameDuration(): number {
    return this.metadata.frameRate && this.metadata.frameRate > 0
      ? 1 / this.metadata.frameRate
      : 1 / 30;
  }

  private clampTimeToAvailableFrame(time: number): number {
    const normalizedTime = Math.max(time, 0);
    if (!this.metadata.duration || this.metadata.duration <= 0) {
      return normalizedTime;
    }

    const frameDuration = this.getFrameDuration();
    return Math.min(normalizedTime, Math.max(this.metadata.duration - frameDuration, 0));
  }

  private buildAttemptTimes(requestedTime: number): number[] {
    const frameDuration = this.getFrameDuration();
    const preferredTime = this.clampTimeToAvailableFrame(requestedTime);
    const candidateTimes = [
      preferredTime,
      requestedTime,
      preferredTime - frameDuration / 2,
      preferredTime - frameDuration,
      preferredTime - frameDuration * 2,
      preferredTime - frameDuration * 4,
      preferredTime - 0.1,
      preferredTime - 0.25,
      preferredTime - 0.5,
      0,
    ];

    const deduped = new Set<string>();
    return candidateTimes
      .map((time) => this.clampTimeToAvailableFrame(time))
      .filter((time) => {
        const key = time.toFixed(6);
        if (deduped.has(key)) {
          return false;
        }

        deduped.add(key);
        return true;
      });
  }

  async readFrameAt(time: number): Promise<Buffer> {
    const preferredTime = this.clampTimeToAvailableFrame(time);
    const frameKey = preferredTime.toFixed(6);

    if (this.lastFrame && this.lastFrameKey === frameKey) {
      return this.lastFrame;
    }

    const expectedSize = this.metadata.videoWidth * this.metadata.videoHeight * 4;
    const attempts: string[] = [];
    let lastError: unknown = null;

    for (const attemptTime of this.buildAttemptTimes(time)) {
      try {
        const { stdout, stderr } = await runCommand(FFMPEG_PATH, [
          '-hide_banner',
          '-loglevel',
          'error',
          '-ss',
          attemptTime.toFixed(6),
          '-i',
          this.metadata.inputPath,
          '-frames:v',
          '1',
          '-f',
          'rawvideo',
          '-pix_fmt',
          'rgba',
          'pipe:1',
        ]);

        if (stdout.length === expectedSize) {
          this.lastFrameKey = frameKey;
          this.lastFrame = stdout;
          return stdout;
        }

        attempts.push(
          `t=${attemptTime.toFixed(6)} => ${stdout.length} bytes${stderr ? `, stderr=${stderr.slice(-300).trim()}` : ''}`
        );
      } catch (error) {
        lastError = error;
        attempts.push(
          `t=${attemptTime.toFixed(6)} => ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const details = [
      `Unexpected frame extraction result for ${this.metadata.inputPath}.`,
      `requested=${time.toFixed(6)}s`,
      `preferred=${preferredTime.toFixed(6)}s`,
      this.metadata.duration !== null ? `duration=${this.metadata.duration.toFixed(6)}s` : 'duration=unknown',
      this.metadata.frameRate !== null ? `frameRate=${this.metadata.frameRate.toFixed(6)}fps` : 'frameRate=unknown',
      `expected=${expectedSize} bytes`,
      attempts.length > 0 ? `attempts: ${attempts.join(' | ')}` : 'attempts: none',
    ];

    if (lastError && !attempts.some((attempt) => attempt.includes(String(lastError)))) {
      details.push(`lastError=${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }

    throw new Error(details.join(' '));
  }
}
