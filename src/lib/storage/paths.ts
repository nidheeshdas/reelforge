import fs from 'fs';
import path from 'path';

const DEFAULT_UPLOAD_DIR = 'public/uploads';
const DEFAULT_RENDER_DIR = 'public/renders';

function resolveAppPath(targetPath: string | undefined, fallback: string): string {
  const value = targetPath?.trim() || fallback;
  return path.isAbsolute(value) ? value : path.join(process.cwd(), value);
}

export function getUploadDir(): string {
  return resolveAppPath(process.env.UPLOAD_DIR, DEFAULT_UPLOAD_DIR);
}

export function getRenderDir(): string {
  return resolveAppPath(process.env.RENDER_DIR, DEFAULT_RENDER_DIR);
}

export function ensureDirectory(dirPath: string): string {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function ensureUploadDir(): string {
  return ensureDirectory(getUploadDir());
}

export function ensureRenderDir(): string {
  return ensureDirectory(getRenderDir());
}

export function getRenderFilename(renderId: number): string {
  return `${renderId}.mp4`;
}

export function getRenderPublicPath(renderId: number): string {
  return `/renders/${getRenderFilename(renderId)}`;
}

export function getRenderOutputPath(renderId: number): string {
  return path.join(ensureRenderDir(), getRenderFilename(renderId));
}

export function resolveStoredRenderPath(outputPath: string): string {
  const normalized = outputPath
    .replace(/\\/g, '/')
    .replace(/^\/?public\//, '')
    .replace(/^\/+/, '');

  if (!normalized || normalized.split('/').includes('..')) {
    throw new Error('Invalid render output path');
  }

  if (normalized.startsWith('renders/')) {
    return path.join(getRenderDir(), normalized.slice('renders/'.length));
  }

  return path.join(process.cwd(), 'public', normalized);
}
