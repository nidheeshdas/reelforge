import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { parseTemplateId, templateDetailSelect, type TemplateRouteContext } from '@/lib/templates/api';
import { getTemplateLifecycleUpdate } from '@/lib/templates/validation';

export const dynamic = 'force-dynamic';

export async function POST(_: Request, { params }: TemplateRouteContext) {
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
        publishedAt: true,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (existingTemplate.creatorId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const template = await prisma.template.update({
      where: { id: templateId },
      data: getTemplateLifecycleUpdate('public', existingTemplate.publishedAt),
      select: templateDetailSelect,
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Template publish error:', error);
    return NextResponse.json({ error: 'Failed to publish template' }, { status: 500 });
  }
}
