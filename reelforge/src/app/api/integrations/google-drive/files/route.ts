import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGoogleDriveService } from '@/lib/integrations/google-drive';

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.google-apps.video',
  'application/vnd.google-apps.audio',
  'application/vnd.google-apps.photo',
];

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    const drive = await getGoogleDriveService(userId);
    
    if (!drive) {
      return NextResponse.json({ error: 'Google Drive not connected' }, { status: 400 });
    }
    
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';
    
    const files = await drive.listFiles(folderId);
    
    const filteredFiles = files.filter(file => {
      if (file.isFolder) return true;
      return ALLOWED_MIME_TYPES.includes(file.mimeType);
    });
    
    return NextResponse.json({ files: filteredFiles });
  } catch (error) {
    console.error('Google Drive error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch files' },
      { status: 500 }
    );
  }
}
