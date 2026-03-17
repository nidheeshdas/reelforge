import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { templateDetailSelect, templateListSelect } from '@/lib/templates/api';
import { getPublicTemplatePublishError, getPublicTemplateWhere } from '@/lib/templates/access';
import {
  createTemplateSchema,
  getPublishedAtForStatus,
  normalizeTemplateText,
  normalizeTemplateThumbnailUrl,
} from '@/lib/templates/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') ?? 'public';
    const category = searchParams.get('category')?.trim();
    const sort = searchParams.get('sort')?.trim();
    const session = await getServerSession(authOptions);

    const where: Prisma.TemplateWhereInput = {};

    if (scope === 'public') {
      Object.assign(where, getPublicTemplateWhere());
    } else if (scope === 'mine') {
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      where.creatorId = parseInt(session.user.id);
    } else {
      return NextResponse.json({ error: 'Invalid scope parameter' }, { status: 400 });
    }

    if (category) {
      where.category = category;
    }

    const publicOrderBy =
      sort === 'popular'
        ? [{ downloads: 'desc' as const }, { publishedAt: 'desc' as const }, { id: 'desc' as const }]
        : [{ publishedAt: 'desc' as const }, { id: 'desc' as const }];

    const templates = await prisma.template.findMany({
      where,
      select: templateListSelect,
      orderBy: scope === 'public' ? publicOrderBy : [{ updatedAt: 'desc' }, { id: 'desc' }],
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Templates list error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const status = data.status ?? 'draft';
    const publishError = getPublicTemplatePublishError(data.priceCents ?? 0);

    if (status === 'public' && publishError) {
      return NextResponse.json({ error: publishError }, { status: 400 });
    }

    const createData: Prisma.TemplateUncheckedCreateInput = {
      creatorId: userId,
      title: data.title.trim(),
      description: normalizeTemplateText(data.description),
      category: normalizeTemplateText(data.category),
      tags: data.tags?.map((tag) => tag.trim()) ?? [],
      vidscript: data.vidscript,
      placeholders:
        data.placeholders === undefined ? Prisma.JsonNull : (data.placeholders as Prisma.InputJsonValue),
      defaultValues:
        data.defaultValues === undefined ? Prisma.JsonNull : (data.defaultValues as Prisma.InputJsonValue),
      thumbnailUrl: normalizeTemplateThumbnailUrl(data.thumbnailUrl),
      priceCents: data.priceCents ?? 0,
      status,
      publishedAt: getPublishedAtForStatus(status) ?? null,
    };

    const template = await prisma.template.create({
      data: createData,
      select: templateDetailSelect,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Template create error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
