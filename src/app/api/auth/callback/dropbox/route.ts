import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DropboxService } from '@/lib/integrations/dropbox';
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
    return NextResponse.redirect(new URL(`${callbackPath}?error=dropbox_code_missing`, request.url));
  }

  try {
    const tokens = await DropboxService.getTokensFromCode(code);

    await upsertConnectedApp({
      userId: parseInt(session.user.id, 10),
      provider: 'dropbox',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
    });

    return NextResponse.redirect(new URL(`${callbackPath}?connected=dropbox`, request.url));
  } catch (error) {
    console.error('Dropbox callback error:', error);
    return NextResponse.redirect(new URL(`${callbackPath}?error=dropbox_connection_failed`, request.url));
  }
}
