import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSafeCallbackPath } from '@/lib/integrations/oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/auth/login?error=not_authenticated', request.url));
    }

    const { searchParams } = new URL(request.url);
    const callbackPath = getSafeCallbackPath(searchParams.get('callbackUrl'));

    const clientId = process.env.GITHUB_ID;
    if (!clientId) {
      return NextResponse.redirect(new URL('/account?error=github_not_configured', request.url));
    }

    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/github`;
    const authUrl = new URL('https://github.com/login/oauth/authorize');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'repo read:user user:email');
    authUrl.searchParams.set('state', callbackPath);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('GitHub connect start error:', error);
    return NextResponse.redirect(new URL('/account?error=connection_failed', request.url));
  }
}
