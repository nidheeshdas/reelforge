import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { upsertConnectedApp } from '@/lib/integrations/connection-store';
import { getSafeCallbackPath } from '@/lib/integrations/oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const requestUrl = new URL(request.url);
  const callbackPath = getSafeCallbackPath(requestUrl.searchParams.get('state'));

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/login?error=not_authenticated', request.url));
  }

  const code = requestUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL(`${callbackPath}?error=github_code_missing`, request.url));
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_ID,
        client_secret: process.env.GITHUB_SECRET,
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/github`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || 'GitHub token exchange failed');
    }

    await upsertConnectedApp({
      userId: parseInt(session.user.id, 10),
      provider: 'github',
      accessToken: tokenData.access_token,
    });

    return NextResponse.redirect(new URL(`${callbackPath}?connected=github`, request.url));
  } catch (error) {
    console.error('GitHub callback error:', error);
    return NextResponse.redirect(new URL(`${callbackPath}?error=github_connection_failed`, request.url));
  }
}
