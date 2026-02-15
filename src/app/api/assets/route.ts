import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db/prisma';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const userId = parseInt(session.user.id);
    
    const assets = await prisma.asset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Assets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const uploadDir = process.env.UPLOAD_DIR || './public/uploads';
    const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filepath = path.join(uploadDir, filename);
    
    await writeFile(filepath, buffer);
    
    const asset = await prisma.asset.create({
      data: {
        userId,
        filename: file.name,
        filepath: `/uploads/${filename}`,
        fileType: file.type.split('/')[0],
        fileSize: BigInt(file.size),
        mimeType: file.type,
        source: 'local',
      },
    });
    
    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
    }
    
    const userId = parseInt(session.user.id);
    
    const asset = await prisma.asset.findFirst({
      where: { id: parseInt(id), userId },
    });
    
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    
    await prisma.asset.delete({
      where: { id: parseInt(id) },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}
