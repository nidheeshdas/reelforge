import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDropboxService } from '@/lib/integrations/dropbox';

export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = [
  '.mp4', '.webm', '.mov', '.avi',
  '.mp3', '.wav', '.ogg', '.m4a',
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    const dropbox = await getDropboxService(userId);
    
    if (!dropbox) {
      return NextResponse.json({ error: 'Dropbox not connected' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    const files = await dropbox.listFiles(path);
    
    const filteredFiles = files.filter(file => {
      if (file.isFolder) return true;
      const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    
    return NextResponse.json({ files: filteredFiles });
  } catch (error) {
    console.error('Dropbox error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
