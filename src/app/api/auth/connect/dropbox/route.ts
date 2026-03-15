import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DropboxService } from '@/lib/integrations/dropbox';
import { getSafeCallbackPath } from '@/lib/integrations/oauth-state';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/login?error=not_authenticated', request.url));
  }

  const { searchParams } = new URL(request.url);
  const callbackPath = getSafeCallbackPath(searchParams.get('callbackUrl'));

  try {
    return NextResponse.redirect(DropboxService.getAuthUrl(callbackPath));
  } catch (error) {
    console.error('Dropbox connect start error:', error);
    return NextResponse.redirect(new URL('/account?error=dropbox_not_configured', request.url));
  }
}
