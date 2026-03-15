import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    const keyId = params.id;
    
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    
    await prisma.apiKey.delete({
      where: { id: keyId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    const keyId = params.id;
    
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });
    
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }
    
    await prisma.apiKey.updateMany({
      where: { userId, provider: apiKey.provider },
      data: { isDefault: false },
    });
    
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isDefault: true },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set default error:', error);
    return NextResponse.json(
      { error: 'Failed to set default API key' },
      { status: 500 }
    );
  }
}
