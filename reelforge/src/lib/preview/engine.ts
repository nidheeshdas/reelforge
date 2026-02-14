import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { getShader } from '@/shaders/library';

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
  private videos: Map<string, THREE.VideoTexture> = new Map();
  private currentTime = 0;
  private isPlaying = false;
  private animationId: number | null = null;
  private onTimeUpdate: ((time: number) => void) | null = null;
  private resolution: { width: number; height: number };
  
  constructor(options: PreviewOptions = {}) {
    const width = options.width || 720;
    const height = options.height || 1280;
    this.resolution = { width, height };
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    this.camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
    this.camera.position.z = 1;
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    
    if (options.container) {
      options.container.appendChild(this.renderer.domElement);
    }
  }
  
  async loadVideo(url: string, name: string): Promise<void> {
    const video = document.createElement('video');
    video.src = url;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    
    await new Promise<void>((resolve, reject) => {
      video.oncanplay = () => resolve();
      video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
    });
    
    video.play();
    
    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    
    this.videos.set(name, texture);
  }
  
  getVideoTexture(name: string): THREE.VideoTexture | undefined {
    return this.videos.get(name);
  }
  
  applyFilter(filterName: string, params: Record<string, number> = {}): void {
    const shader = getShader(filterName);
    if (shader) {
      const pass = new ShaderPass({
        uniforms: {
          uTexture: { value: null },
          ...Object.fromEntries(
            Object.entries(shader.uniforms).map(([key, val]) => [key, { value: val.value }])
          ),
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: shader.fragmentShader,
      });
      
      for (const [key, val] of Object.entries(params)) {
        const uniformKey = key.startsWith('u') ? key : `u${key.charAt(0).toUpperCase()}${key.slice(1)}`;
        if (pass.uniforms[uniformKey]) {
          pass.uniforms[uniformKey].value = val;
        }
      }
      
      this.composer.addPass(pass);
    }
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
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);
    
    mesh.position.set(x + meshWidth / 2, this.resolution.height - y - meshHeight / 2, 0);
    
    this.scene.add(mesh);
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
    });
    
    const geometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    const mesh = new THREE.Mesh(geometry, material);
    
    const x = options.x ?? this.resolution.width / 2 - canvas.width / 2;
    const y = options.y ?? this.resolution.height / 2 - canvas.height / 2;
    mesh.position.set(x + canvas.width / 2, this.resolution.height - y - canvas.height / 2, 1);
    
    this.scene.add(mesh);
    return mesh;
  }
  
  play(): void {
    this.isPlaying = true;
    this.animate();
  }
  
  pause(): void {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  seek(time: number): void {
    this.currentTime = time;
    this.videos.forEach((texture) => {
      if (texture.image && texture.image instanceof HTMLVideoElement) {
        texture.image.currentTime = time;
      }
    });
    this.render();
  }
  
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  setOnTimeUpdate(callback: (time: number) => void): void {
    this.onTimeUpdate = callback;
  }
  
  private animate = (): void => {
    if (!this.isPlaying) return;
    
    this.animationId = requestAnimationFrame(this.animate);
    
    this.videos.forEach((texture) => {
      texture.needsUpdate = true;
    });
    
    this.render();
    
    if (this.videos.size > 0) {
      const firstVideo = Array.from(this.videos.values())[0];
      if (firstVideo?.image instanceof HTMLVideoElement) {
        this.currentTime = firstVideo.image.currentTime;
        this.onTimeUpdate?.(this.currentTime);
      }
    }
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
    
    this.videos.forEach((texture) => {
      texture.dispose();
    });
    
    this.videos.clear();
    
    while (this.scene.children.length > 0) {
      const object = this.scene.children[0];
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (object.material instanceof THREE.Material) {
          object.material.dispose();
        }
      }
      this.scene.remove(object);
    }
  }
}
