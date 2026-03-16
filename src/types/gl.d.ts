declare module 'gl' {
  interface HeadlessGLOptions {
    alpha?: boolean;
    antialias?: boolean;
    depth?: boolean;
    stencil?: boolean;
    preserveDrawingBuffer?: boolean;
    premultipliedAlpha?: boolean;
    powerPreference?: string;
  }

  export default function createGL(
    width: number,
    height: number,
    options?: HeadlessGLOptions,
  ): WebGLRenderingContext | null;
}
