import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/encryption';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const expiresAt = searchParams.get('expiresAt');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/login?error=not_authenticated', request.url));
    }
    
    if (!accessToken) {
      return NextResponse.redirect(new URL('/account?error=no_token', request.url));
    }
    
    const userId = parseInt(session.user.id);
    
    await prisma.connectedApp.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'github',
        },
      },
      create: {
        userId,
        provider: 'github',
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: {},
      },
      update: {
        accessToken: encrypt(accessToken),
        refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      },
    });
    
    return NextResponse.redirect(new URL('/account?connected=github', request.url));
  } catch (error) {
    console.error('GitHub connect error:', error);
    return NextResponse.redirect(new URL('/account?error=connection_failed', request.url));
  }
}
