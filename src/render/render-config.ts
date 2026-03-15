import { parseVidscript } from '@/parser';

export const DEFAULT_RENDER_RESOLUTION = '1080x1920';

export const RENDER_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '1080x1920': { width: 1080, height: 1920 },
  '1080x1080': { width: 1080, height: 1080 },
  '1920x1080': { width: 1920, height: 1080 },
};

export interface RenderScriptConfig {
  outputFilename: string;
  resolutionKey: string;
  resolution: { width: number; height: number };
}

export function extractRenderScriptConfig(
  vidscript: string,
  fallbackResolution: string = DEFAULT_RENDER_RESOLUTION
): RenderScriptConfig {
  const fallbackResolutionKey = RENDER_RESOLUTIONS[fallbackResolution]
    ? fallbackResolution
    : DEFAULT_RENDER_RESOLUTION;

  const fallbackConfig: RenderScriptConfig = {
    outputFilename: 'render.mp4',
    resolutionKey: fallbackResolutionKey,
    resolution: RENDER_RESOLUTIONS[fallbackResolutionKey],
  };

  const parseResult = parseVidscript(vidscript);
  if (!parseResult.ast) {
    return fallbackConfig;
  }

  const outputNode = parseResult.ast.statements.find((statement) => statement.type === 'Output');
  if (!outputNode || outputNode.type !== 'Output') {
    return fallbackConfig;
  }

  const requestedResolution = outputNode.options?.resolution;
  const resolutionKey = requestedResolution && RENDER_RESOLUTIONS[requestedResolution]
    ? requestedResolution
    : fallbackResolutionKey;

  return {
    outputFilename: sanitizeDownloadFilename(outputNode.path || fallbackConfig.outputFilename),
    resolutionKey,
    resolution: RENDER_RESOLUTIONS[resolutionKey],
  };
}

export function sanitizeDownloadFilename(filename: string): string {
  const segments = filename.replace(/\\/g, '/').split('/').filter(Boolean);
  const raw = segments.at(-1) || 'render.mp4';
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '');

  if (!sanitized) {
    return 'render.mp4';
  }

  if (sanitized.toLowerCase().endsWith('.mp4')) {
    return sanitized;
  }

  return `${sanitized}.mp4`;
}
