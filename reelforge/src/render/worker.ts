import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { parseVidscript, fillPlaceholders } from '@/parser';
import { prisma } from '@/lib/db/prisma';
import { getShader } from '@/shaders/library';

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

const FFMPEG_FILTER_MAP: Record<string, string> = {
  monochrome: 'colorchannelmixer=.3:.59:.11:.3:.59:.11:.3:.59:.11',
  sepia: 'colorchannelmixer=.393:.769:.189:.349:.686:.168:.272:.534:.131',
  vignette: 'vignette=angle=PI/4',
  contrast: 'eq=contrast=1.2',
  saturation: 'eq=saturation=1.5',
  brightness: 'eq=brightness=0.1',
  blur: 'gblur=sigma=5',
  chromatic: 'chromatic_aberration=rc=0.002:gc=0.002:bc=0.002',
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
    
    const outputDir = path.join(process.cwd(), 'public', 'renders');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${renderId}.mp4`);
    const ast = parseResult.ast;
    const duration = estimateDuration(ast);
    
    await processVideo(ast, outputPath, width, height, duration, onProgress);
    
    const relativePath = `/renders/${renderId}.mp4`;
    
    await prisma.render.update({
      where: { id: renderId },
      data: {
        status: 'completed',
        progress: 100,
        outputPath: relativePath,
        completedAt: new Date(),
        duration,
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

function estimateDuration(ast: any): number {
  let maxEnd = 10;
  
  for (const stmt of ast.statements || []) {
    if (stmt.type === 'TimeBlock' && stmt.end?.value !== Infinity) {
      maxEnd = Math.max(maxEnd, stmt.end.value);
    }
  }
  
  return maxEnd;
}

async function processVideo(
  ast: any,
  outputPath: string,
  width: number,
  height: number,
  duration: number,
  onProgress?: (progress: number) => void
): Promise<void> {
  const inputStatements = ast.statements?.filter((s: any) => s.type === 'Input') || [];
  const timeBlocks = ast.statements?.filter((s: any) => s.type === 'TimeBlock') || [];
  const outputStatement = ast.statements?.find((s: any) => s.type === 'Output');
  
  let inputFile = '';
  let filterComplex = '';
  const filters: string[] = [];
  
  for (const input of inputStatements) {
    if (input.path && input.path.endsWith('.mp4')) {
      inputFile = input.path.replace(/^public\//, '');
    }
  }
  
  if (!inputFile || !fs.existsSync(path.join(process.cwd(), 'public', inputFile))) {
    throw new Error('No input video file found');
  }
  
  const fullInputPath = path.join(process.cwd(), 'public', inputFile);
  
  for (const tb of timeBlocks) {
    for (const instruction of tb.instructions || []) {
      if (instruction.type === 'Filter' && instruction.name) {
        const ffmpegFilter = FFMPEG_FILTER_MAP[instruction.name.toLowerCase()];
        if (ffmpegFilter) {
          filters.push(ffmpegFilter);
        }
      }
      
      if (instruction.type === 'Text' && instruction.content) {
        const textFilter = buildTextFilter(instruction, tb.start?.value || 0, tb.end?.value || duration);
        if (textFilter) {
          filters.push(textFilter);
        }
      }
    }
  }
  
  if (filters.length > 0) {
    filterComplex = filters.join(',');
  }
  
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', fullInputPath,
      '-t', duration.toString(),
      '-vf', `scale=${width}:${height}${filterComplex ? ',' + filterComplex : ''}`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      outputPath,
    ];
    
    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      
      const timeMatch = stderr.match(/time=(\d+):(\d+):(\d+\.\d+)/);
      if (timeMatch) {
        const currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3]);
        const progress = Math.min(99, Math.round((currentTime / duration) * 100));
        onProgress?.(progress);
      }
    });
    
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
      }
    });
    
    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to run ffmpeg: ${err.message}`));
    });
  });
}

function buildTextFilter(instruction: any, startTime: number, endTime: number): string {
  const content = instruction.content || '';
  const params = instruction.params || {};
  const position = params.position || 'center';
  const style = params.style || 'title';
  const color = params.color || 'white';
  const stroke = params.stroke || 'black';
  
  let fontsize = style === 'title' ? '48' : '36';
  if (params.size) fontsize = params.size.toString();
  
  let x = '(w-text_w)/2';
  let y = '(h-text_h)/2';
  
  if (position === 'top') {
    y = '20';
  } else if (position === 'bottom') {
    y = 'h-text_h-20';
  } else if (position === 'top-left') {
    x = '10';
    y = '10';
  } else if (position === 'top-right') {
    x = 'w-text_w-10';
    y = '10';
  } else if (position === 'bottom-left') {
    x = '10';
    y = 'h-text_h-10';
  } else if (position === 'bottom-right') {
    x = 'w-text_w-10';
    y = 'h-text_h-10';
  }
  
  const escapedText = content.replace(/'/g, "\\'").replace(/:/g, '\\:');
  
  return `drawtext=text='${escapedText}':fontsize=${fontsize}:fontcolor=${color}:x=${x}:y=${y}:borderw=2:bordercolor=${stroke}:enable='between(t,${startTime},${endTime})'`;
}
