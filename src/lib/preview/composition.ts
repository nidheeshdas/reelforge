import * as THREE from 'three';
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { parseVidscript } from '@/parser';
import type {
  CompositeNode,
  FilterNode,
  InputNode,
  OverlayNode,
  ProgramNode,
  ShaderNode,
  TextNode,
  TextParams,
  TimeBlockNode,
  VideoLoopNode,
  VideoOpacityNode,
  VideoResizeNode,
  VideoSpeedNode,
  VideoTrimNode,
} from '@/types/vidscript';
import { PreviewEngine } from './engine';

const DEFAULT_DURATION = 10;
const FRAME_EPSILON = 1 / 120;

type PreviewInstruction =
  | TextNode
  | FilterNode
  | ShaderNode
  | VideoTrimNode
  | VideoResizeNode
  | VideoSpeedNode
  | VideoLoopNode
  | VideoOpacityNode
  | OverlayNode
  | CompositeNode
  | string;

interface InputMedia {
  name: string;
  path: string;
  isVideo: boolean;
  duration: number | null;
  videoWidth: number;
  videoHeight: number;
}

interface VideoClipDraft {
  sourceName: string;
  startTime: number;
  endHint: number | null;
  sourceStartTime: number;
  sourceEndTime: number;
  playbackRate: number;
  loopCount: number;
  opacity: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  layer: number;
  mode: 'base' | 'overlay';
}

interface EffectDraft {
  kind: 'filter' | 'shader';
  name: string;
  params: Record<string, number>;
  startTime: number;
  endHint: number | null;
}

interface CompiledBlock {
  startTime: number;
  explicitEnd: number | null;
  endHint: number | null;
  clipDrafts: VideoClipDraft[];
  textDrafts: Array<{ instruction: TextNode; startTime: number }>;
  effectDrafts: EffectDraft[];
}

export interface TextOverlay {
  text: string;
  startTime: number;
  endTime: number;
  style?: string;
  position?: string;
  color?: string;
  font?: string;
  fontSize?: number;
  animation?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface VideoClip {
  sourceName: string;
  startTime: number;
  endTime: number;
  sourceStartTime: number;
  sourceEndTime: number;
  playbackRate: number;
  loopCount: number;
  opacity: number;
  mesh: THREE.Mesh;
}

export interface EffectTrack {
  pass: ShaderPass;
  startTime: number;
  endTime: number;
}

export interface BuiltComposition {
  duration: number;
  overlays: TextOverlay[];
  textMeshes: THREE.Mesh[];
  videoClips: VideoClip[];
  effects: EffectTrack[];
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asPositiveNumber(value: unknown, fallback: number): number {
  const normalized = asFiniteNumber(value, fallback);
  return normalized > 0 ? normalized : fallback;
}

function asCount(value: unknown, fallback = 1): number {
  const normalized = Math.floor(asFiniteNumber(value, fallback));
  return normalized > 0 ? normalized : fallback;
}

function asOpacity(value: unknown, fallback = 1): number {
  const normalized = asFiniteNumber(value, fallback);
  return Math.max(0, Math.min(1, normalized));
}

function isVideoPath(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext === 'mp4' || ext === 'webm' || ext === 'mov';
}

function normalizeNumericParams<T extends Record<string, unknown>>(params: T | undefined): Record<string, number> {
  const result: Record<string, number> = {};

  if (!params) return result;

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
    }
  }

  return result;
}

function resolveTextOverlay(
  instruction: TextNode,
  startTime: number,
  endTime: number,
): TextOverlay {
  const params = (instruction.params ?? {}) as TextParams;

  return {
    text: String(instruction.content || 'Text'),
    startTime,
    endTime,
    style: typeof params.style === 'string' ? params.style : 'default',
    position: typeof params.position === 'string' ? params.position : 'center',
    color: typeof params.color === 'string' ? params.color : 'white',
    font: typeof params.font === 'string' ? params.font : undefined,
    fontSize: typeof params.size === 'number' && Number.isFinite(params.size) ? params.size : undefined,
    animation: typeof params.animation === 'string' ? params.animation : undefined,
    stroke: typeof params.stroke === 'string' ? params.stroke : undefined,
    strokeWidth: typeof params.stroke_width === 'number' && Number.isFinite(params.stroke_width)
      ? params.stroke_width
      : undefined,
  };
}

function getFontSize(overlay: TextOverlay): number {
  if (overlay.fontSize) return overlay.fontSize;

  switch (overlay.style) {
    case 'title':
      return 64;
    case 'subtitle':
      return 54;
    case 'caption':
      return 36;
    default:
      return 48;
  }
}

function computeTextPosition(overlay: TextOverlay, width: number, height: number): { x: number; y: number } {
  const fontSize = getFontSize(overlay);
  const estimatedTextWidth = Math.max(80, Math.round(overlay.text.length * fontSize * 0.58) + 20);
  const estimatedTextHeight = fontSize + 20;
  const marginX = Math.round(width * 0.05);
  const marginY = Math.round(height * 0.05);
  const position = overlay.position || 'center';

  let x: number;
  let y: number;

  if (position.includes('left')) {
    x = marginX;
  } else if (position.includes('right')) {
    x = Math.max(marginX, width - estimatedTextWidth - marginX);
  } else {
    x = Math.round((width - estimatedTextWidth) / 2);
  }

  if (position.includes('top')) {
    y = marginY;
  } else if (position.includes('bottom')) {
    y = Math.max(marginY, height - estimatedTextHeight - marginY);
  } else {
    y = Math.round((height - estimatedTextHeight) / 2);
  }

  return { x, y };
}

function deriveClipEnd(draft: VideoClipDraft): number | null {
  const segmentDuration = Math.max(0, draft.sourceEndTime - draft.sourceStartTime);
  if (segmentDuration <= 0 || draft.playbackRate <= 0) {
    return null;
  }

  return draft.startTime + (segmentDuration / draft.playbackRate) * draft.loopCount;
}

function getTrimWindow(params: VideoTrimNode['params'], inputDuration: number | null): { start: number; end: number } {
  const normalizedParams = typeof params === 'object' && params !== null ? params : {};
  const start = Math.max(0, asFiniteNumber(normalizedParams.start, 0));
  const naturalEnd = Number.isFinite(inputDuration) ? Math.max(inputDuration as number, start) : start + DEFAULT_DURATION;
  const end = Math.max(start, asFiniteNumber(normalizedParams.end, naturalEnd));
  return { start, end };
}

function compileTimeBlock(
  stmt: TimeBlockNode,
  inputs: Map<string, InputMedia>,
  nextLayerStart: number,
): { block: CompiledBlock; nextLayer: number } {
  const startTime = Math.max(0, asFiniteNumber(stmt.start?.value, 0));
  const explicitEnd = Number.isFinite(stmt.end?.value) ? Math.max(startTime, stmt.end.value) : null;
  const clipDrafts: VideoClipDraft[] = [];
  const textDrafts: Array<{ instruction: TextNode; startTime: number }> = [];
  const effectDrafts: EffectDraft[] = [];
  const draftBySource = new Map<string, VideoClipDraft>();
  let nextLayer = nextLayerStart;

  const ensureDraft = (sourceName: string, mode: 'base' | 'overlay' = 'base'): VideoClipDraft | null => {
    const input = inputs.get(sourceName);
    if (!input?.isVideo) {
      return null;
    }

    const existing = draftBySource.get(sourceName);
    if (existing) {
      if (mode === 'overlay') existing.mode = 'overlay';
      return existing;
    }

    const draft: VideoClipDraft = {
      sourceName,
      startTime,
      endHint: explicitEnd,
      sourceStartTime: 0,
      sourceEndTime: input.duration && Number.isFinite(input.duration) ? input.duration : DEFAULT_DURATION,
      playbackRate: 1,
      loopCount: 1,
      opacity: 1,
      x: 0,
      y: 0,
      layer: nextLayer++,
      mode,
    };

    draftBySource.set(sourceName, draft);
    clipDrafts.push(draft);
    return draft;
  };

  for (const instruction of stmt.instructions as PreviewInstruction[]) {
    if (typeof instruction === 'string') {
      ensureDraft(instruction, 'base');
      continue;
    }

    switch (instruction.type) {
      case 'VideoTrim': {
        const draft = ensureDraft(instruction.target, 'base');
        if (!draft) break;
        const input = inputs.get(instruction.target);
        const trimWindow = getTrimWindow(instruction.params, input?.duration ?? null);
        draft.sourceStartTime = trimWindow.start;
        draft.sourceEndTime = trimWindow.end;
        draft.endHint = explicitEnd ?? deriveClipEnd(draft);
        break;
      }
      case 'VideoResize': {
        const draft = ensureDraft(instruction.target, 'base');
        if (!draft) break;
        draft.width = Math.max(1, instruction.width);
        draft.height = Math.max(1, instruction.height);
        break;
      }
      case 'VideoSpeed': {
        const draft = ensureDraft(instruction.target, 'base');
        if (!draft) break;
        draft.playbackRate = asPositiveNumber(instruction.factor, 1);
        draft.endHint = explicitEnd ?? deriveClipEnd(draft);
        break;
      }
      case 'VideoLoop': {
        const draft = ensureDraft(instruction.target, 'base');
        if (!draft) break;
        draft.loopCount = asCount(instruction.count, 1);
        draft.endHint = explicitEnd ?? deriveClipEnd(draft);
        break;
      }
      case 'VideoOpacity': {
        const draft = ensureDraft(instruction.target, 'base');
        if (!draft) break;
        draft.opacity = asOpacity(instruction.value, 1);
        break;
      }
      case 'Overlay': {
        ensureDraft(instruction.target, 'base');
        const overlayDraft = ensureDraft(instruction.overlay, 'overlay');
        if (!overlayDraft) break;
        overlayDraft.mode = 'overlay';
        overlayDraft.x = asFiniteNumber(instruction.params?.x, overlayDraft.x);
        overlayDraft.y = asFiniteNumber(instruction.params?.y, overlayDraft.y);
        overlayDraft.opacity = asOpacity(instruction.params?.opacity, overlayDraft.opacity);
        break;
      }
      case 'Composite': {
        ensureDraft(instruction.target, 'base');
        const compositeDraft = ensureDraft(instruction.other, 'overlay');
        if (!compositeDraft) break;
        compositeDraft.mode = 'overlay';
        compositeDraft.x = asFiniteNumber(instruction.params?.x, compositeDraft.x);
        compositeDraft.y = asFiniteNumber(instruction.params?.y, compositeDraft.y);
        compositeDraft.opacity = asOpacity(instruction.params?.opacity, compositeDraft.opacity);
        break;
      }
      case 'Text':
        textDrafts.push({ instruction, startTime });
        break;
      case 'Filter':
        effectDrafts.push({
          kind: 'filter',
          name: instruction.name,
          params: normalizeNumericParams(instruction.params),
          startTime,
          endHint: explicitEnd,
        });
        break;
      case 'Shader':
        effectDrafts.push({
          kind: 'shader',
          name: instruction.name,
          params: normalizeNumericParams(instruction.params),
          startTime,
          endHint: explicitEnd,
        });
        break;
      default:
        break;
    }
  }

  const derivedEnd = clipDrafts
    .map((draft) => draft.endHint ?? deriveClipEnd(draft))
    .reduce<number | null>((latest, endTime) => {
      if (endTime === null) return latest;
      return latest === null ? endTime : Math.max(latest, endTime);
    }, explicitEnd);

  return {
    block: {
      startTime,
      explicitEnd,
      endHint: derivedEnd,
      clipDrafts,
      textDrafts,
      effectDrafts,
    },
    nextLayer,
  };
}

function resolveBlockEnd(block: CompiledBlock, duration: number): number {
  if (block.explicitEnd !== null) return block.explicitEnd;
  if (block.endHint !== null) return block.endHint;
  return duration;
}

function resolveClipSourceTime(clip: VideoClip, currentTime: number): number {
  const localTime = Math.max(0, currentTime - clip.startTime);
  const segmentDuration = Math.max(0, clip.sourceEndTime - clip.sourceStartTime);

  if (segmentDuration <= 0) {
    return clip.sourceStartTime;
  }

  const scaledTime = localTime * clip.playbackRate;
  const loopedTime = clip.loopCount > 1 ? scaledTime % segmentDuration : Math.min(scaledTime, segmentDuration - FRAME_EPSILON);
  const sourceTime = clip.sourceStartTime + loopedTime;
  return Math.max(clip.sourceStartTime, Math.min(sourceTime, Math.max(clip.sourceEndTime - FRAME_EPSILON, clip.sourceStartTime)));
}

function isActiveAt(currentTime: number, startTime: number, endTime: number): boolean {
  return currentTime >= startTime && currentTime < endTime;
}

export function applyCompositionState(engine: PreviewEngine, composition: BuiltComposition, currentTime: number): void {
  composition.textMeshes.forEach((mesh, index) => {
    const overlay = composition.overlays[index];
    mesh.visible = !!overlay && isActiveAt(currentTime, overlay.startTime, overlay.endTime);
  });

  composition.effects.forEach((effect) => {
    engine.setFilterEnabled(effect.pass, isActiveAt(currentTime, effect.startTime, effect.endTime));
  });

  composition.videoClips.forEach((clip) => {
    const active = isActiveAt(currentTime, clip.startTime, clip.endTime);
    clip.mesh.visible = active;

    const material = Array.isArray(clip.mesh.material) ? clip.mesh.material[0] : clip.mesh.material;
    if (material instanceof THREE.MeshBasicMaterial) {
      material.transparent = clip.opacity < 1;
      material.opacity = active ? clip.opacity : 0;
    }

    if (!active) return;

    engine.syncVideo(clip.sourceName, resolveClipSourceTime(clip, currentTime), {
      playbackRate: clip.playbackRate,
    });
  });
}

export async function buildComposition(
  engine: PreviewEngine,
  code: string,
  width: number,
  height: number,
): Promise<BuiltComposition> {
  console.log('[Composition] Building composition', { width, height });
  const result = parseVidscript(code);

  if (result.errors.length > 0) {
    throw new Error(result.errors[0].message);
  }

  if (!result.ast) {
    throw new Error('Failed to parse code');
  }

  const program = result.ast as ProgramNode;
  const inputs = new Map<string, InputMedia>();

  for (const stmt of program.statements) {
    if (stmt.type !== 'Input' || !stmt.path) continue;

    const input = stmt as InputNode;
    const videoInput = isVideoPath(input.path);

    if (videoInput) {
      console.log('[Composition] Loading input video', { name: input.name, path: input.path });
      await engine.loadVideo(input.path, input.name);
    }

    const videoElement = engine.getVideoElement(input.name);
    inputs.set(input.name, {
      name: input.name,
      path: input.path,
      isVideo: videoInput,
      duration: videoElement && Number.isFinite(videoElement.duration) ? videoElement.duration : null,
      videoWidth: videoElement?.videoWidth || width,
      videoHeight: videoElement?.videoHeight || height,
    });
  }

  const timeBlocks = program.statements.filter((stmt): stmt is TimeBlockNode => stmt.type === 'TimeBlock');
  let nextLayer = 0;
  const compiledBlocks: CompiledBlock[] = [];

  for (const block of timeBlocks) {
    const compiled = compileTimeBlock(block, inputs, nextLayer);
    compiledBlocks.push(compiled.block);
    nextLayer = compiled.nextLayer;
  }

  const maxInputDuration = Array.from(inputs.values()).reduce((maxDuration, input) => {
    return input.duration && Number.isFinite(input.duration)
      ? Math.max(maxDuration, input.duration)
      : maxDuration;
  }, 0);

  const duration = Math.max(
    DEFAULT_DURATION,
    maxInputDuration,
    ...compiledBlocks.map((block) => block.explicitEnd ?? block.endHint ?? block.startTime),
  );

  const overlays: TextOverlay[] = [];
  const textMeshes: THREE.Mesh[] = [];
  const videoClips: VideoClip[] = [];
  const effects: EffectTrack[] = [];

  for (const block of compiledBlocks) {
    const endTime = Math.max(block.startTime, resolveBlockEnd(block, duration));

    for (const textDraft of block.textDrafts) {
      const overlay = resolveTextOverlay(textDraft.instruction, textDraft.startTime, endTime);
      const { x, y } = computeTextPosition(overlay, width, height);
      const mesh = engine.addText(overlay.text, {
        x,
        y,
        fontSize: getFontSize(overlay),
        color: overlay.color || 'white',
        font: overlay.font,
      });
      mesh.visible = false;
      overlays.push(overlay);
      textMeshes.push(mesh);
    }

    for (const effectDraft of block.effectDrafts) {
      const pass = engine.applyFilter(effectDraft.name, effectDraft.params, { enabled: false });
      effects.push({
        pass,
        startTime: effectDraft.startTime,
        endTime,
      });
    }

    for (const draft of block.clipDrafts) {
      const input = inputs.get(draft.sourceName);
      if (!input?.isVideo) continue;

      const meshWidth = draft.width ?? (draft.mode === 'overlay' ? Math.min(input.videoWidth, width) : width);
      const meshHeight = draft.height ?? (draft.mode === 'overlay' ? Math.min(input.videoHeight, height) : height);
      const mesh = engine.addVideoMesh(draft.sourceName, draft.x, draft.y, meshWidth, meshHeight);
      mesh.position.z = draft.mode === 'overlay' ? 0.2 + draft.layer * 0.001 : draft.layer * 0.001;
      mesh.renderOrder = draft.layer;
      mesh.visible = false;

      const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.transparent = draft.opacity < 1;
        material.opacity = 0;
      }

      videoClips.push({
        sourceName: draft.sourceName,
        startTime: draft.startTime,
        endTime,
        sourceStartTime: draft.sourceStartTime,
        sourceEndTime: draft.sourceEndTime,
        playbackRate: draft.playbackRate,
        loopCount: draft.loopCount,
        opacity: draft.opacity,
        mesh,
      });
    }
  }

  const built: BuiltComposition = { duration, overlays, textMeshes, videoClips, effects };
  applyCompositionState(engine, built, 0);

  console.log('[Composition] Built', {
    duration,
    overlays: overlays.length,
    textMeshes: textMeshes.length,
    videoClips: videoClips.length,
    effects: effects.length,
  });

  return built;
}
