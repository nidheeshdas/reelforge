import * as THREE from 'three';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface RenderVideoMetadata {
  duration: number | null;
  videoWidth: number;
  videoHeight: number;
}

export interface RenderTextOptions {
  x?: number;
  y?: number;
  fontSize?: number;
  color?: string;
  font?: string;
}

export interface RenderFilterOptions {
  enabled?: boolean;
}

export interface RenderVideoSyncOptions {
  playbackRate?: number;
}

export interface RenderCompositionEngine {
  loadVideo(url: string, name: string): Promise<void>;
  getVideoMetadata(name: string): RenderVideoMetadata | undefined;
  addVideoMesh(name: string, x?: number, y?: number, width?: number, height?: number): THREE.Mesh;
  addText(content: string, options?: RenderTextOptions): THREE.Mesh;
  applyFilter(name: string, params?: Record<string, number>, options?: RenderFilterOptions): ShaderPass;
  setFilterEnabled(pass: ShaderPass, enabled: boolean): void;
  syncVideo(name: string, time: number, options?: RenderVideoSyncOptions): void;
}
