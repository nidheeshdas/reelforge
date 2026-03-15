import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { getShader, vertexShader } from '@/shaders/library';

export interface PreviewOptions {
  width?: number;
  height?: number;
  container?: HTMLElement;
}

export class PreviewEngine {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private filterPasses: ShaderPass[] = [];
  private videos: Map<string, THREE.VideoTexture> = new Map();
  private videoElements: HTMLVideoElement[] = [];
  private videoElementsByName: Map<string, HTMLVideoElement> = new Map();
  private sceneObjects: THREE.Object3D[] = [];
  private currentTime = 0;
  private isPlaying = false;
  private animationId: number | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private frameUpdater: ((time: number) => void) | null = null;
  private lastAnimationTime: number | null = null;
  private compositionDuration: number | null = null;
  private resolution: { width: number; height: number };
  private readonly debug = true;
  private container: HTMLElement | null = null;

  constructor(options: PreviewOptions = {}) {
    const width = options.width || 720;
    const height = options.height || 1280;
    this.resolution = { width, height };

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
    this.camera.position.z = 1;

    const canvas = document.createElement('canvas');
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    };
    const gl2 = canvas.getContext('webgl2', contextAttributes);
    const gl = gl2 || canvas.getContext('webgl', contextAttributes);
    if (!gl) {
      throw new Error('Error creating WebGL context.');
    }
    this.log('Created WebGL context', {
      context: gl2 ? 'webgl2' : 'webgl1',
      width,
      height,
    });

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: gl,
      antialias: false,
      preserveDrawingBuffer: true,
      alpha: true,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = false;
    this.renderer.shadowMap.type = THREE.BasicShadowMap;
    this.renderer.autoClear = true;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    if (options.container) {
      options.container.replaceChildren();
      options.container.appendChild(this.renderer.domElement);
      this.container = options.container;
    }
  }

  async loadVideo(url: string, name: string): Promise<void> {
    const normalizedUrl = url.replace(/^\.?\/?public\//, '');
    const fullUrl = normalizedUrl.startsWith('http') || normalizedUrl.startsWith('/')
      ? normalizedUrl
      : `/${normalizedUrl}`;
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      if (fullUrl.startsWith('http')) {
        try {
          const target = new URL(fullUrl, window.location.origin);
          if (target.origin !== window.location.origin) {
            video.crossOrigin = 'anonymous';
          }
        } catch {}
      }
      video.src = fullUrl;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.style.position = 'fixed';
      video.style.left = '-10000px';
      video.style.top = '-10000px';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      document.body.appendChild(video);
      this.log('Loading video', { name, url: fullUrl });

      video.addEventListener('loadedmetadata', () => {
        this.log('loadedmetadata', {
          name,
          duration: Number.isFinite(video.duration) ? video.duration : null,
          width: video.videoWidth,
          height: video.videoHeight,
          readyState: video.readyState,
        });
      });
      video.addEventListener('loadeddata', () => {
        this.log('loadeddata', { name, readyState: video.readyState });
      });
      video.addEventListener('canplay', () => {
        this.log('canplay', { name, readyState: video.readyState });
      });
      video.addEventListener('error', () => {
        this.log('video error', {
          name,
          networkState: video.networkState,
          readyState: video.readyState,
          src: video.currentSrc || fullUrl,
        });
      });

      const timeout = setTimeout(() => {
        reject(new Error(`Video load timeout: ${url}`));
      }, 10000);

      video.onloadedmetadata = async () => {
        clearTimeout(timeout);

        await Promise.race([
          new Promise<void>((eventResolve) => {
            if (video.readyState >= 3) {
              eventResolve();
              return;
            }
            const onCanPlay = () => {
              video.removeEventListener('canplay', onCanPlay);
              eventResolve();
            };
            video.addEventListener('canplay', onCanPlay, { once: true });
          }),
          new Promise<void>((eventResolve) => setTimeout(eventResolve, 1000)),
        ]);

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.colorSpace = THREE.SRGBColorSpace;

        this.videos.set(name, texture);
        this.videoElements.push(video);
        this.videoElementsByName.set(name, video);

        const finalizeReady = () => {
          texture.needsUpdate = true;
          resolve();
        };

        const seekToStart = () => {
          const onSeeked = () => {
            video.pause();
            finalizeReady();
          };
          video.addEventListener('seeked', onSeeked, { once: true });
          try {
            video.currentTime = 0;
          } catch {
            video.removeEventListener('seeked', onSeeked);
            video.pause();
            finalizeReady();
          }
          setTimeout(() => {
            video.removeEventListener('seeked', onSeeked);
            video.pause();
            finalizeReady();
          }, 300);
        };

        video.play().then(() => {
          seekToStart();
        }).catch(() => {
          seekToStart();
        });
      };

      video.onerror = (e) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to load video: ${url} - ${e}`));
      };
    });
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getVideoTexture(name: string): THREE.VideoTexture | undefined {
    return this.videos.get(name);
  }

  addVideoMesh(name: string, x = 0, y = 0, width?: number, height?: number): THREE.Mesh {
    const texture = this.videos.get(name);
    if (!texture) {
      throw new Error(`Video texture not found: ${name}`);
    }

    const videoWidth = texture.image?.videoWidth || 1920;
    const videoHeight = texture.image?.videoHeight || 1080;

    const meshWidth = width || videoWidth;
    const meshHeight = height || videoHeight;

    const geometry = new THREE.PlaneGeometry(meshWidth, meshHeight);
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    this.log('Adding video mesh', {
      name,
      meshWidth,
      meshHeight,
      videoWidth,
      videoHeight,
    });

    mesh.position.set(x + meshWidth / 2, this.resolution.height - y - meshHeight / 2, 0);

    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
    return mesh;
  }

  addText(
    content: string,
    options: {
      x?: number;
      y?: number;
      fontSize?: number;
      color?: string;
      font?: string;
    } = {}
  ): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const fontSize = options.fontSize || 48;
    ctx.font = `${fontSize}px ${options.font || 'Inter, sans-serif'}`;

    const metrics = ctx.measureText(content);
    canvas.width = metrics.width + 20;
    canvas.height = fontSize + 20;

    ctx.font = `${fontSize}px ${options.font || 'Inter, sans-serif'}`;
    ctx.fillStyle = options.color || 'white';
    ctx.textBaseline = 'top';
    ctx.fillText(content, 10, 5);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const geometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    const mesh = new THREE.Mesh(geometry, material);

    const x = options.x ?? this.resolution.width / 2 - canvas.width / 2;
    const y = options.y ?? this.resolution.height / 2 - canvas.height / 2;
    mesh.position.set(x + canvas.width / 2, this.resolution.height - y - canvas.height / 2, 0.5);

    this.scene.add(mesh);
    this.sceneObjects.push(mesh);
    return mesh;
  }

  applyFilter(
    name: string,
    params: Record<string, number> = {},
    options: { enabled?: boolean } = {}
  ): ShaderPass {
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

  resetComposition(): void {
    this.pause();
    this.clearFilters();
    this.clearSceneObjects();
    this.clearVideos();
    this.currentTime = 0;
    this.frameUpdater = null;
    this.lastAnimationTime = null;
    this.compositionDuration = null;
  }

  play(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.videoElements.forEach((video) => {
      video.pause();
    });
    this.lastAnimationTime = performance.now();
    this.animate();
  }

  pause(): void {
    this.isPlaying = false;
    this.videoElements.forEach((video) => {
      video.pause();
    });
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.lastAnimationTime = null;
  }

  seek(time: number): void {
    void this.seekTo(time);
  }

  async seekTo(time: number): Promise<void> {
    this.currentTime = Math.max(0, time);

    await Promise.all(Array.from(this.videos.values()).map(async (texture) => {
      if (!(texture.image instanceof HTMLVideoElement)) {
        texture.needsUpdate = true;
        return;
      }

      const video = texture.image;
      video.pause();

        const targetTime = Number.isFinite(video.duration) && video.duration > 0
          ? Math.min(Math.max(this.currentTime, 0), Math.max(video.duration - 0.001, 0))
          : Math.max(this.currentTime, 0);

      await new Promise<void>((resolve) => {
        let timeoutId = 0;

        const handleSeeked = () => {
          settle();
        };

        const settle = () => {
          video.removeEventListener('seeked', handleSeeked);
          clearTimeout(timeoutId);
          texture.needsUpdate = true;
          resolve();
        };

        timeoutId = window.setTimeout(settle, 250);

        if (Math.abs(video.currentTime - targetTime) < 0.01) {
          settle();
          return;
        }

        video.addEventListener('seeked', handleSeeked, { once: true });

        try {
          video.currentTime = targetTime;
        } catch {
          settle();
        }
      });
    }));

    this.frameUpdater?.(this.currentTime);
    await this.waitForAnimationFrame();
    this.updateVideoTextures();
    this.render();
    this.onTimeUpdate?.(this.currentTime);
  }

  private waitForAnimationFrame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  updateVideoTextures(): void {
    this.videos.forEach((texture) => {
      texture.needsUpdate = true;
    });
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  setOnTimeUpdate(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }

  setFrameUpdater(callback: ((time: number) => void) | null): void {
    this.frameUpdater = callback;
  }

  setCompositionDuration(duration: number): void {
    this.compositionDuration = Number.isFinite(duration) ? Math.max(duration, 0) : null;
  }

  getVideoElement(name: string): HTMLVideoElement | undefined {
    return this.videoElementsByName.get(name);
  }

  syncVideo(name: string, time: number, options: { playbackRate?: number } = {}): void {
    const video = this.videoElementsByName.get(name);
    const texture = this.videos.get(name);

    if (!video || !texture) return;

    video.pause();

    const nextPlaybackRate = options.playbackRate && Number.isFinite(options.playbackRate) && options.playbackRate > 0
      ? options.playbackRate
      : 1;

    if (video.playbackRate !== nextPlaybackRate) {
      video.playbackRate = nextPlaybackRate;
    }

    if (video.readyState >= 1) {
      const maxTime = Number.isFinite(video.duration) && video.duration > 0
        ? Math.max(video.duration - 0.001, 0)
        : Math.max(time, 0);
      const safeTime = Math.min(Math.max(time, 0), maxTime);

      if (Math.abs(video.currentTime - safeTime) > 1 / 120) {
        try {
          video.currentTime = safeTime;
        } catch {}
      }
    }

    texture.needsUpdate = true;
  }

  private animate = (now: number = performance.now()): void => {
    if (!this.isPlaying) return;

    if (this.lastAnimationTime === null) {
      this.lastAnimationTime = now;
    }

    const delta = Math.max(0, (now - this.lastAnimationTime) / 1000);
    this.lastAnimationTime = now;
    this.currentTime += delta;

    if (this.compositionDuration !== null && this.currentTime >= this.compositionDuration) {
      this.currentTime = this.compositionDuration;
      this.frameUpdater?.(this.currentTime);
      this.render();
      this.onTimeUpdate?.(this.currentTime);
      this.pause();
      return;
    }

    this.frameUpdater?.(this.currentTime);
    this.render();
    this.onTimeUpdate?.(this.currentTime);
    this.animationId = requestAnimationFrame(this.animate);
  };

  render(): void {
    this.composer.render();
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  getDataURL(): string {
    return this.renderer.domElement.toDataURL('image/png');
  }

  dispose(): void {
    this.pause();
    this.renderer.dispose();
    this.composer.dispose();

    this.clearFilters();
    this.clearVideos();
    this.clearSceneObjects();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if (this.container) {
      this.container.replaceChildren();
      this.container = null;
    }
  }

  private clearFilters(): void {
    for (const pass of this.filterPasses) {
      this.composer.removePass(pass);
    }
    this.filterPasses = [];
  }

  private clearVideos(): void {
    this.videos.forEach((texture) => {
      texture.dispose();
    });
    this.videos.clear();
    this.videoElementsByName.clear();

    this.videoElements.forEach((video) => {
      video.pause();
      video.src = '';
      video.load();
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    });
    this.videoElements = [];
  }

  private clearSceneObjects(): void {
    this.sceneObjects.forEach((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material?.dispose();
        }
      }
      this.scene.remove(object);
    });
    this.sceneObjects = [];
  }

  private log(message: string, payload?: Record<string, unknown>): void {
    if (!this.debug) return;
    if (payload) {
      console.log(`[PreviewEngine] ${message}`, payload);
      return;
    }
    console.log(`[PreviewEngine] ${message}`);
  }
}
