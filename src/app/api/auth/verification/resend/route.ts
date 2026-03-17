import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { requireSessionUserId } from '@/lib/auth/session';
import { createEmailVerificationToken } from '@/lib/auth/tokens';
import { sendEmailVerificationEmail } from '@/lib/email';
import { getAppUrl } from '@/lib/app-url';

export async function POST(request: Request) {
  try {
    const auth = await requireSessionUserId();

    if (auth.response) {
      return auth.response;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        email: true,
        name: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ success: true, message: 'Your email is already verified.' });
    }

    const { token } = await createEmailVerificationToken(auth.userId);
    const appUrl = getAppUrl(new URL(request.url).origin);
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

    await sendEmailVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    });

    return NextResponse.json({ success: true, message: 'Verification email sent.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
  }
}
