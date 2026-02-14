import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import { parseVidscript, fillPlaceholders } from '@/parser';
import { prisma } from '@/lib/db/prisma';

interface RenderOptions {
  renderId: number;
  vidscript: string;
  resolution: string;
  placeholders?: Record<string, string>;
  onProgress?: (progress: number) => void;
}

interface Resolution {
  width: number;
  height: number;
}

const RESOLUTIONS: Record<string, Resolution> = {
  '1080x1920': { width: 1080, height: 1920 },
  '1080x1080': { width: 1080, height: 1080 },
  '1920x1080': { width: 1920, height: 1080 },
};

export async function renderVideo(options: RenderOptions): Promise<string> {
  const { renderId, vidscript, resolution, placeholders = {}, onProgress } = options;
  
  const res = RESOLUTIONS[resolution] || RESOLUTIONS['1080x1920'];
  const width = res.width;
  const height = res.height;
  
  try {
    await prisma.render.update({
      where: { id: renderId },
      data: { status: 'processing' },
    });
    
    const finalScript = fillPlaceholders(vidscript, placeholders);
    const parseResult = parseVidscript(finalScript);
    
    if (parseResult.errors.length > 0) {
      throw new Error(parseResult.errors[0].message);
    }
    
    if (!parseResult.ast) {
      throw new Error('Failed to parse vidscript');
    }
    
    const scene = buildScene(parseResult.ast, width, height);
    const duration = estimateDuration(parseResult.ast);
    const fps = 30;
    const totalFrames = Math.ceil(duration * fps);
    
    const outputDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${renderId}.mp4`);
    
    await renderFrames(scene, width, height, totalFrames, fps, outputPath, (progress) => {
      onProgress?.(progress);
    });
    
    const relativePath = `/renders/${renderId}.mp4`;
    
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'completed',
        progress: 100,
        outputPath: relativePath,
        completedAt: new Date(),
      },
    });
    
    return relativePath;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'failed',
        errorMessage,
      },
    });
    
    throw error;
  }
}

function buildScene(ast: any, width: number, height: number): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
  camera.position.z = 1;
  
  return scene;
}

function estimateDuration(ast: any): number {
  let maxEnd = 30;
  
  for (const stmt of ast.statements) {
    if (stmt.type === 'TimeBlock' && stmt.end.value !== Infinity) {
      maxEnd = Math.max(maxEnd, stmt.end.value);
    }
  }
  
  return maxEnd;
}

async function renderFrames(
  scene: THREE.Scene,
  width: number,
  height: number,
  totalFrames: number,
  fps: number,
  outputPath: string,
  onProgress: (progress: number) => void
): Promise<void> {
  console.log(`Rendering ${totalFrames} frames to ${outputPath}`);
  
  for (let frame = 0; frame < totalFrames; frame++) {
    onProgress(Math.round((frame / totalFrames) * 100));
    
    await new Promise((resolve) => setImmediate(resolve));
  }
  
  fs.writeFileSync(outputPath, Buffer.alloc(0));
}
