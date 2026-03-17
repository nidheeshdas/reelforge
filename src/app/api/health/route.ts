import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { ensureRenderDir, ensureUploadDir, getRenderDir, getUploadDir } from '@/lib/storage/paths';

export async function GET() {
  const checks = {
    database: 'up' as 'up' | 'down',
    uploadDir: getUploadDir(),
    renderDir: getRenderDir(),
  };
  const errors: string[] = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    checks.database = 'down';
    errors.push(error instanceof Error ? error.message : 'Database health check failed');
  }

  try {
    ensureUploadDir();
    ensureRenderDir();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Storage path check failed');
  }

  const healthy = checks.database === 'up' && errors.length === 0;

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      checks,
      errors,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 }
  );
}
