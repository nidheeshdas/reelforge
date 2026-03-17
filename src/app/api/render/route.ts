import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireSessionUserId } from '@/lib/auth/session';
import { renderHeadlessComposition } from '@/render/webgl-renderer';
import { extractRenderScriptConfig } from '@/render/render-config';

function getBaseUrl(request: NextRequest): string {
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUserId();

    if (auth.response) {
      return auth.response;
    }

    const body = await request.json();
    const { vidscript, resolution } = body;

    if (!vidscript) {
      return NextResponse.json({ error: 'Vidscript required' }, { status: 400 });
    }

    const renderConfig = extractRenderScriptConfig(
      vidscript,
      typeof resolution === 'string' ? resolution : undefined
    );
    const baseUrl = getBaseUrl(request);

    const render = await prisma.render.create({
      data: {
        userId: auth.userId,
        vidscript,
        status: 'pending',
        progress: 0,
        resolution: renderConfig.resolutionKey,
      },
    });

    void (async () => {
      try {
        await prisma.render.update({
          where: { id: render.id },
          data: {
            status: 'processing',
            progress: 1,
            errorMessage: null,
          },
        });

        const outputPath = await renderHeadlessComposition({
          renderId: render.id,
          vidscript,
          resolution: renderConfig.resolution,
          baseUrl,
          onProgress: async (progress) => {
            try {
              await prisma.render.update({
                where: { id: render.id },
                data: {
                  progress: Math.min(progress, 99),
                  status: 'processing',
                },
              });
            } catch (updateError) {
              console.error('Failed to update render progress:', updateError);
            }
          },
        });

        await prisma.render.update({
          where: { id: render.id },
          data: {
            status: 'completed',
            progress: 100,
            outputPath,
            errorMessage: null,
            completedAt: new Date(),
          },
        });
      } catch (error) {
        console.error('Render failed:', error);
        await prisma.render.update({
          where: { id: render.id },
          data: {
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    })();

    return NextResponse.json({
      renderId: render.id,
      status: render.status,
      resolution: renderConfig.resolutionKey,
      outputFilename: renderConfig.outputFilename,
    });
  } catch (error) {
    console.error('Create render error:', error);
    return NextResponse.json(
      { error: 'Failed to create render' },
      { status: 500 }
    );
  }
}

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

  const renderConfig = extractRenderScriptConfig(render.vidscript, render.resolution);

  return NextResponse.json({
    id: render.id,
    status: render.status,
    progress: render.progress,
    outputUrl: render.outputPath,
    outputFilename: renderConfig.outputFilename,
    downloadUrl: render.outputPath ? `/api/render/download?id=${render.id}` : null,
    error: render.errorMessage,
  });
}
