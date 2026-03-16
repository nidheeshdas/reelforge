import { createCanvas } from 'canvas';
import type { Canvas, CanvasRenderingContext2D } from 'canvas';
import { createRequire } from 'module';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type {
  RenderCompositionEngine,
  RenderFilterOptions,
  RenderTextOptions,
  RenderVideoMetadata,
  RenderVideoSyncOptions,
} from '@/lib/render/shared-render-core';
import { getShader, vertexShader } from '@/shaders/library';
import { ServerVideoFrameSource, probeVideoMetadata } from '@/render/server-video-source';

const require = createRequire(import.meta.url);

type HeadlessGLContext = WebGLRenderingContext & {
  finish?: () => void;
  getExtension: (name: string) => unknown;
};

type HeadlessCanvas = {
  width: number;
  height: number;
  style: Record<string, string>;
  addEventListener: (type: string, listener: unknown, options?: unknown) => void;
  removeEventListener: (type: string, listener: unknown, options?: unknown) => void;
  getContext: (contextId: string, options?: WebGLContextAttributes) => WebGLRenderingContext | CanvasRenderingContext2D | null;
};

type CreateGL = typeof import('gl').default;

function loadCreateGL(): CreateGL {
  const glModule = require('gl') as CreateGL | { default: CreateGL };
  return typeof glModule === 'function' ? glModule : glModule.default;
}

interface HeadlessVideoEntry {
  frameSource: ServerVideoFrameSource;
  metadata: RenderVideoMetadata;
  texture: THREE.DataTexture;
  pendingTime: number | null;
}

function createHeadlessCanvas(width: number, height: number, glContext: HeadlessGLContext): HeadlessCanvas {
  const surface = createCanvas(width, height);
  return {
    width,
    height,
    style: {},
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    getContext: (contextId: string) => {
      if (contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl') {
        return glContext;
      }

      if (contextId === '2d') {
        return surface.getContext('2d');
      }

      return null;
    },
  };
}

function createDataTexture(data: Uint8Array, width: number, height: number): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(data), width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function extractCanvasTexture(canvas: Canvas): THREE.DataTexture {
  const context = canvas.getContext('2d');
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  return createDataTexture(new Uint8Array(imageData.data), canvas.width, canvas.height);
}

function primaryMaterial(mesh: THREE.Mesh): THREE.Material | null {
  return Array.isArray(mesh.material) ? mesh.material[0] ?? null : mesh.material;
}

function flipRgbaBuffer(source: Uint8Array, width: number, height: number): Buffer {
  const rowSize = width * 4;
  const flipped = Buffer.allocUnsafe(source.byteLength);

  for (let y = 0; y < height; y += 1) {
    const sourceOffset = y * rowSize;
    const targetOffset = (height - y - 1) * rowSize;
    flipped.set(source.subarray(sourceOffset, sourceOffset + rowSize), targetOffset);
  }

  return flipped;
}

function ensureHeadlessAnimationContext(): void {
  const runtime = globalThis as typeof globalThis & {
    self?: unknown;
  };

  if (runtime.self) {
    return;
  }

  runtime.self = {
    requestAnimationFrame: (callback: FrameRequestCallback) => (
      setTimeout(() => callback(performance.now()), 16) as unknown as number
    ),
    cancelAnimationFrame: (handle: number) => {
      clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
    },
  } as unknown as Window & typeof globalThis;
}

export class HeadlessRenderEngine implements RenderCompositionEngine {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.OrthographicCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly glContext: HeadlessGLContext;
  private readonly canvas: HeadlessCanvas;
  private readonly framePixels: Uint8Array;
  private readonly resolution: { width: number; height: number };
  private readonly videos = new Map<string, HeadlessVideoEntry>();
  private readonly sceneObjects: THREE.Object3D[] = [];
  private readonly filterPasses: ShaderPass[] = [];

  constructor(width: number, height: number) {
    this.resolution = { width, height };
    ensureHeadlessAnimationContext();

    const createGL = loadCreateGL();
    const context = createGL(width, height, {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });

    if (!context) {
      throw new Error('Failed to create headless WebGL context.');
    }

    this.glContext = context as HeadlessGLContext;
    this.canvas = createHeadlessCanvas(width, height, this.glContext);
    this.framePixels = new Uint8Array(width * height * 4);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
    this.camera.position.z = 1;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas as unknown as HTMLCanvasElement,
      context: this.glContext,
      antialias: false,
      preserveDrawingBuffer: true,
      alpha: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.autoClear = true;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
  }

  async loadVideo(url: string, name: string): Promise<void> {
    const metadata = await probeVideoMetadata(url);
    const initialPixels = new Uint8Array(metadata.videoWidth * metadata.videoHeight * 4);
    const texture = createDataTexture(initialPixels, metadata.videoWidth, metadata.videoHeight);

    this.videos.set(name, {
      frameSource: new ServerVideoFrameSource(metadata),
      metadata: {
        duration: metadata.duration,
        videoWidth: metadata.videoWidth,
        videoHeight: metadata.videoHeight,
      },
      texture,
      pendingTime: 0,
    });
  }

  getVideoMetadata(name: string): RenderVideoMetadata | undefined {
    return this.videos.get(name)?.metadata;
  }

  addVideoMesh(name: string, x = 0, y = 0, width?: number, height?: number): THREE.Mesh {
    const entry = this.videos.get(name);
    if (!entry) {
      throw new Error(`Video texture not found: ${name}`);
    }

    const meshWidth = width || entry.metadata.videoWidth;
    const meshHeight = height || entry.metadata.videoHeight;
    const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight);
    const material = new THREE.MeshBasicMaterial({
      map: entry.texture,
      side: THREE.DoubleSide,
      transparent: true,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x + meshWidth / 2, this.resolution.height - y - meshHeight / 2, 0);

    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
    return mesh;
  }

  addText(content: string, options: RenderTextOptions = {}): THREE.Mesh {
    const fontSize = options.fontSize || 48;
    const canvas = createCanvas(1, 1);
    const context = canvas.getContext('2d');
    context.font = `${fontSize}px ${options.font || 'Inter, sans-serif'}`;

    const metrics = context.measureText(content);
    const textCanvas = createCanvas(
      Math.max(20, Math.ceil(metrics.width + 20)),
      Math.max(20, Math.ceil(fontSize + 20)),
    );
    const textContext = textCanvas.getContext('2d');
    textContext.font = `${fontSize}px ${options.font || 'Inter, sans-serif'}`;
    textContext.fillStyle = options.color || 'white';
    textContext.textBaseline = 'top';
    textContext.fillText(content, 10, 5);

    const texture = extractCanvasTexture(textCanvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(textCanvas.width, textCanvas.height);
    const mesh = new THREE.Mesh(geometry, material);
    const x = options.x ?? this.resolution.width / 2 - textCanvas.width / 2;
    const y = options.y ?? this.resolution.height / 2 - textCanvas.height / 2;
    mesh.position.set(x + textCanvas.width / 2, this.resolution.height - y - textCanvas.height / 2, 0.5);

    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
    return mesh;
  }

  applyFilter(name: string, params: Record<string, number> = {}, options: RenderFilterOptions = {}): ShaderPass {
    const shader = getShader(name);
    if (!shader) {
      throw new Error(`Unknown filter: ${name}`);
    }

    const uniforms: Record<string, { value: unknown }> = {
      tDiffuse: { value: null },
    };

    for (const [key, value] of Object.entries(shader.uniforms || {})) {
      uniforms[key] = { value: value.value };
    }

    for (const [key, value] of Object.entries(params)) {
      const exactKey = uniforms[key] ? key : null;
      const uniformKey = exactKey || `u${key.charAt(0).toUpperCase()}${key.slice(1)}`;
      if (uniforms[uniformKey]) {
        uniforms[uniformKey].value = value;
      }
    }

    if (uniforms.uResolution && typeof uniforms.uResolution.value === 'object' && uniforms.uResolution.value !== null) {
      uniforms.uResolution.value = new THREE.Vector2(this.resolution.width, this.resolution.height);
    }

    const pass = new ShaderPass({
      uniforms,
      vertexShader,
      fragmentShader: shader.fragmentShader,
    });
    pass.enabled = options.enabled ?? true;

    this.composer.addPass(pass);
    this.filterPasses.push(pass);
    return pass;
  }

  setFilterEnabled(pass: ShaderPass, enabled: boolean): void {
    pass.enabled = enabled;
  }

  syncVideo(name: string, time: number, _options: RenderVideoSyncOptions = {}): void {
    const entry = this.videos.get(name);
    if (!entry) {
      return;
    }
    const duration = entry.metadata.duration && entry.metadata.duration > 0
      ? Math.max(entry.metadata.duration - 1 / 120, 0)
      : Math.max(time, 0);
    entry.pendingTime = Math.min(Math.max(time, 0), duration);
  }

  private async prepareVideoFrames(): Promise<void> {
    await Promise.all(
      Array.from(this.videos.values()).map(async (entry) => {
        if (entry.pendingTime === null) {
          return;
        }

        const rawFrame = await entry.frameSource.readFrameAt(entry.pendingTime);
        entry.pendingTime = null;

        const textureImage = entry.texture.image as unknown as {
          data: Uint8Array | Uint8ClampedArray;
          width: number;
          height: number;
        };
        textureImage.data.set(rawFrame);
        textureImage.width = entry.metadata.videoWidth;
        textureImage.height = entry.metadata.videoHeight;
        entry.texture.needsUpdate = true;
      }),
    );
  }

  render(): void {
    this.composer.render();
  }

  async renderFrame(_currentTime: number): Promise<Buffer> {
    await this.prepareVideoFrames();
    this.render();
    this.glContext.finish?.();
    this.glContext.readPixels(
      0,
      0,
      this.resolution.width,
      this.resolution.height,
      this.glContext.RGBA,
      this.glContext.UNSIGNED_BYTE,
      this.framePixels,
    );

    return flipRgbaBuffer(this.framePixels, this.resolution.width, this.resolution.height);
  }

  dispose(): void {
    for (const pass of this.filterPasses) {
      this.composer.removePass(pass);
    }

    this.filterPasses.length = 0;
    this.videos.forEach((entry) => {
      entry.texture.dispose();
    });
    this.videos.clear();

    this.sceneObjects.forEach((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        const material = primaryMaterial(object);
        material?.dispose();
      }
      this.scene.remove(object);
    });
    this.sceneObjects.length = 0;

    this.composer.dispose();
    this.renderer.dispose();

    const destroyContext = this.glContext.getExtension('STACKGL_destroy_context') as { destroy?: () => void } | null;
    destroyContext?.destroy?.();
  }
}
