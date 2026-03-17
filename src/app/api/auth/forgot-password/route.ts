import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { createPasswordResetToken } from '@/lib/auth/tokens';
import { sendPasswordResetEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string };

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      const { token } = await createPasswordResetToken(user.id);
      const appUrl = getAppUrl(new URL(request.url).origin);
      const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

      void sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      }).catch((error) => {
        console.error('Password reset email send failed:', error);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'If that email exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Failed to start reset flow' }, { status: 500 });
  }
}
