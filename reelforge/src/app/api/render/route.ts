import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';

export async function POST(request: Request) {
  try {
    const { renderId } = await request.json();
    
    const render = await prisma.render.create({
      data: {
        userId: 1, // TODO: Get from auth
        vidscript: '',
        status: 'pending',
        progress: 0,
        resolution: '1080x1920',
      },
    });
    
    return NextResponse.json({ renderId: render.id });
  } catch (error) {
    console.error('Create render error:', error);
    return NextResponse.json(
      { error: 'Failed to create render' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const renderId = searchParams.get('id');
  
  if (!renderId) {
    return NextResponse.json({ error: 'Render ID required' }, { status: 400 });
  }
  
  const render = await prisma.render.findUnique({
    where: { id: parseInt(renderId) },
  });
  
  if (!render) {
    return NextResponse.json({ error: 'Render not found' }, { status: 404 });
  }
  
  return NextResponse.json(render);
}
