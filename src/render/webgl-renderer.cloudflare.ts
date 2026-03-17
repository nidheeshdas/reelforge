export interface WebGLRenderOptions {
  renderId: number;
  vidscript: string;
  resolution: { width: number; height: number };
  fps?: number;
  baseUrl?: string;
  onProgress?: (progress: number) => void | Promise<void>;
}

export async function renderHeadlessComposition(_: WebGLRenderOptions): Promise<string> {
  throw new Error('Inline rendering is not available in Cloudflare app builds.');
}
