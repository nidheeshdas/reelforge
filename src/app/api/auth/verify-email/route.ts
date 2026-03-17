import { NextResponse } from 'next/server';
import { consumeEmailVerificationToken } from '@/lib/auth/tokens';
import { getAppUrl } from '@/lib/app-url';

export async function GET(request: Request) {
  const appUrl = getAppUrl(new URL(request.url).origin);
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.redirect(`${appUrl}/auth/login?verification=invalid`);
  }

  try {
    const tokenRecord = await consumeEmailVerificationToken(token);

    if (!tokenRecord) {
      return NextResponse.redirect(`${appUrl}/auth/login?verification=invalid`);
    }

    return NextResponse.redirect(`${appUrl}/auth/login?verification=verified`);
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.redirect(`${appUrl}/auth/login?verification=error`);
  }
}
