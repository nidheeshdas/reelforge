import { parseVidscript } from '@/parser';

export const DEFAULT_RENDER_RESOLUTION = '1080x1920';
const RESOLUTION_PATTERN = /^(\d{2,5})x(\d{2,5})$/;
const MIN_RENDER_DIMENSION = 64;
const MAX_RENDER_DIMENSION = 3840;
const MAX_RENDER_PIXELS = 8_294_400;

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

function getOutputOptionValue(
  options: unknown,
  key: 'resolution' | 'format' | 'codec' | 'fps' | 'bitrate',
): string | undefined {
  if (!options || typeof options !== 'object') {
    return undefined;
  }

  const record = options as Record<string, unknown>;
  const mappedValue = record[key];
  if (typeof mappedValue === 'string') {
    return mappedValue;
  }

  if (record.key === key && typeof record.value === 'string') {
    return record.value;
  }

  return undefined;
}

export function resolveRenderResolution(
  requestedResolution?: string,
  fallbackResolution: string = DEFAULT_RENDER_RESOLUTION
): { resolutionKey: string; resolution: { width: number; height: number } } {
  const fallbackResolutionKey = RENDER_RESOLUTIONS[fallbackResolution]
    ? fallbackResolution
    : DEFAULT_RENDER_RESOLUTION;
  const fallback = {
    resolutionKey: fallbackResolutionKey,
    resolution: RENDER_RESOLUTIONS[fallbackResolutionKey],
  };

  if (!requestedResolution) {
    return fallback;
  }

  const normalizedResolution = requestedResolution.trim();
  if (RENDER_RESOLUTIONS[normalizedResolution]) {
    return {
      resolutionKey: normalizedResolution,
      resolution: RENDER_RESOLUTIONS[normalizedResolution],
    };
  }

  const match = normalizedResolution.match(RESOLUTION_PATTERN);
  if (!match) {
    return fallback;
  }

  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);

  if (
    width < MIN_RENDER_DIMENSION ||
    height < MIN_RENDER_DIMENSION ||
    width > MAX_RENDER_DIMENSION ||
    height > MAX_RENDER_DIMENSION ||
    width * height > MAX_RENDER_PIXELS
  ) {
    return fallback;
  }

  return {
    resolutionKey: `${width}x${height}`,
    resolution: { width, height },
  };
}

export function extractRenderScriptConfig(
  vidscript: string,
  fallbackResolution: string = DEFAULT_RENDER_RESOLUTION
): RenderScriptConfig {
  const fallbackResolutionConfig = resolveRenderResolution(undefined, fallbackResolution);
  const fallbackConfig: RenderScriptConfig = {
    outputFilename: 'render.mp4',
    resolutionKey: fallbackResolutionConfig.resolutionKey,
    resolution: fallbackResolutionConfig.resolution,
  };

  const parseResult = parseVidscript(vidscript);
  if (!parseResult.ast) {
    return fallbackConfig;
  }

  const outputNode = parseResult.ast.statements.find((statement) => statement.type === 'Output');
  if (!outputNode || outputNode.type !== 'Output') {
    return fallbackConfig;
  }

  const requestedResolution = getOutputOptionValue(outputNode.options, 'resolution');
  const resolvedResolution = resolveRenderResolution(requestedResolution, fallbackResolution);

  return {
    outputFilename: sanitizeDownloadFilename(outputNode.path || fallbackConfig.outputFilename),
    resolutionKey: resolvedResolution.resolutionKey,
    resolution: resolvedResolution.resolution,
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
