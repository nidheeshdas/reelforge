import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        name: true,
        isDefault: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });
    
    return NextResponse.json({ keys: apiKeys });
  } catch (error) {
    console.error('API keys error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    const { provider, key, name } = (await request.json()) as {
      provider?: string;
      key?: string;
      name?: string;
    };
    
    if (!provider || !key) {
      return NextResponse.json(
        { error: 'Provider and key are required' },
        { status: 400 }
      );
    }
    
    const existingKeys = await prisma.apiKey.findMany({
      where: { userId, provider },
    });
    
    const isDefault = existingKeys.length === 0;
    
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        provider,
        key: encrypt(key),
        name,
        isDefault,
      },
    });
    
    return NextResponse.json({
      key: {
        id: apiKey.id,
        provider: apiKey.provider,
        name: apiKey.name,
        isDefault: apiKey.isDefault,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    console.error('Add API key error:', error);
    return NextResponse.json(
      { error: 'Failed to add API key' },
      { status: 500 }
    );
  }
}
