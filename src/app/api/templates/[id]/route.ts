import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { parseTemplateId, templateDetailSelect, type TemplateRouteContext } from '@/lib/templates/api';
import { isPublicTemplateStatus } from '@/lib/templates/status';
import {
  getTemplateLifecycleUpdate,
  normalizeTemplateText,
  normalizeTemplateThumbnailUrl,
  updateTemplateSchema,
} from '@/lib/templates/validation';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: TemplateRouteContext) {
  try {
    const { id } = await params;
    const templateId = parseTemplateId(id);

    if (templateId === null) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? parseInt(session.user.id) : null;

    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: templateDetailSelect,
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (!isPublicTemplateStatus(template.status) && template.creatorId !== userId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template get error:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: TemplateRouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { id } = await params;
    const templateId = parseTemplateId(id);

    if (templateId === null) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        creatorId: true,
        status: true,
        publishedAt: true,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (existingTemplate.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Prisma.TemplateUpdateInput = {};

    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = normalizeTemplateText(data.description);
    if (data.category !== undefined) updateData.category = normalizeTemplateText(data.category);
    if (data.tags !== undefined) updateData.tags = data.tags.map((tag) => tag.trim());
    if (data.vidscript !== undefined) updateData.vidscript = data.vidscript;
    if (data.placeholders !== undefined) updateData.placeholders = data.placeholders as Prisma.InputJsonValue;
    if (data.defaultValues !== undefined) updateData.defaultValues = data.defaultValues as Prisma.InputJsonValue;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = normalizeTemplateThumbnailUrl(data.thumbnailUrl);
    if (data.priceCents !== undefined) updateData.priceCents = data.priceCents;
    if (data.status !== undefined) {
      Object.assign(updateData, getTemplateLifecycleUpdate(data.status, existingTemplate.publishedAt));
    }

    const template = await prisma.template.update({
      where: { id: templateId },
      data: updateData,
      select: templateDetailSelect,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
