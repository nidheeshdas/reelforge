import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    
    const connections = await prisma.connectedApp.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({ connections });
  } catch (error) {
    console.error('Connections error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connections' },
      { status: 500 }
    );
  }
}
