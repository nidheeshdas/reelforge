import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGitHubService } from '@/lib/integrations/github';

export async function GET(
  request: Request,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    const github = await getGitHubService(userId);
    
    if (!github) {
      return NextResponse.json({ error: 'GitHub not connected' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const contents = await github.getContents(params.owner, params.repo, path);
    
    const vidscriptFiles = contents.filter(
      (item) => item.type === 'file' && (item.name.endsWith('.vs') || item.name.endsWith('.vidscript'))
    );
    
    return NextResponse.json({ contents: vidscriptFiles });
  } catch (error) {
    console.error('GitHub contents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contents' },
      { status: 500 }
    );
  }
}
