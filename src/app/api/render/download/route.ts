import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import { requireSessionUserId } from '@/lib/auth/session';
import prisma from '@/lib/db/prisma';
import { resolveStoredRenderPath } from '@/lib/storage/paths';
import { extractRenderScriptConfig } from '@/render/render-config';

export async function GET(request: NextRequest) {
  const auth = await requireSessionUserId();

  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('id');

  if (!renderId) {
    return NextResponse.json({ error: 'Render ID required' }, { status: 400 });
  }

  const parsedRenderId = Number.parseInt(renderId, 10);
  if (Number.isNaN(parsedRenderId)) {
    return NextResponse.json({ error: 'Invalid render ID' }, { status: 400 });
  }

  const render = await prisma.render.findFirst({
    where: {
      id: parsedRenderId,
      userId: auth.userId,
    },
  });

  if (!render) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }

  if (render.status !== 'completed' || !render.outputPath) {
    return NextResponse.json({ error: 'Render not completed' }, { status: 400 });
  }

  let filePath: string;
  try {
    filePath = resolveStoredRenderPath(render.outputPath);
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
