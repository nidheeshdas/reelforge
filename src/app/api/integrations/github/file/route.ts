import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGitHubService } from '@/lib/integrations/github';

export async function GET(
  request: Request,
  props: { params: Promise<{ owner: string; repo: string }> }
) {
  const params = await props.params;
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
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }
    
    const content = await github.getFileContent(params.owner, params.repo, path);
    
    return NextResponse.json({ content });
  } catch (error) {
    console.error('GitHub file error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    
    const { owner, repo, path, content, message } = await request.json();
    
    if (!owner || !repo || !path || !content || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    await github.saveFile(owner, repo, path, content, message);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GitHub save error:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
