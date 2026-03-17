import { NextRequest, NextResponse } from 'next/server';
import { requireSessionUserId } from '@/lib/auth/session';
import { createRenderWithDebit, InsufficientCreditsError } from '@/lib/billing/ledger';
import { RENDER_CREDIT_COST } from '@/lib/billing/catalog';
import { dispatchRenderJob } from '@/lib/render-dispatch';
import { createRenderJobPayload } from '@/lib/render-dispatch/types';
import { extractRenderScriptConfig } from '@/render/render-config';
import prisma from '@/lib/db/prisma';

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

    const body = (await request.json()) as {
      vidscript?: string;
      resolution?: string;
    };
    const { vidscript, resolution } = body;

    if (!vidscript) {
      return NextResponse.json({ error: 'Vidscript required' }, { status: 400 });
    }

    const renderConfig = extractRenderScriptConfig(
      vidscript,
      typeof resolution === 'string' ? resolution : undefined
    );
    const baseUrl = getBaseUrl(request);

    const { render } = await createRenderWithDebit({
      userId: auth.userId,
      vidscript,
      resolution: renderConfig.resolutionKey,
    });

    const dispatch = await dispatchRenderJob(
      createRenderJobPayload({
        renderId: render.id,
        userId: auth.userId,
        vidscript,
        resolution: renderConfig.resolutionKey,
        baseUrl,
      })
    );

    return NextResponse.json({
      renderId: render.id,
      status: dispatch.queued ? 'queued' : render.status,
      resolution: renderConfig.resolutionKey,
      outputFilename: renderConfig.outputFilename,
      dispatchMode: dispatch.mode,
      queueJobId: dispatch.jobId ?? null,
    });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        {
          error: 'Insufficient credits',
          code: error.code,
          creditsRequired: error.required,
          creditsAvailable: error.available,
          renderCreditCost: RENDER_CREDIT_COST,
        },
        { status: error.status },
      );
    }

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
