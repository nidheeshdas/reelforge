import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import prisma from '@/lib/db/prisma';
import { extractRenderScriptConfig } from '@/render/render-config';

function resolveRenderFilePath(outputPath: string): string {
  const normalized = outputPath
    .replace(/\\/g, '/')
    .replace(/^\/?public\//, '')
    .replace(/^\/+/, '');

  if (!normalized || normalized.split('/').includes('..')) {
    throw new Error('Invalid render output path');
  }

  return path.join(process.cwd(), 'public', normalized);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('id');

  if (!renderId) {
    return NextResponse.json({ error: 'Render ID required' }, { status: 400 });
  }

  const parsedRenderId = Number.parseInt(renderId, 10);
  if (Number.isNaN(parsedRenderId)) {
    return NextResponse.json({ error: 'Invalid render ID' }, { status: 400 });
  }

  const render = await prisma.render.findUnique({
    where: { id: parsedRenderId },
  });

  if (!render) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }

  if (render.status !== 'completed' || !render.outputPath) {
    return NextResponse.json({ error: 'Render not completed' }, { status: 400 });
  }

  let filePath: string;
  try {
    filePath = resolveRenderFilePath(render.outputPath);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid output path' },
      { status: 400 }
    );
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);
  const filename = extractRenderScriptConfig(render.vidscript, render.resolution).outputFilename;

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(fileBuffer.length),
    },
  });
}
