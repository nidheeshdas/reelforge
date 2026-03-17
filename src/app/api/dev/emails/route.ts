import { NextResponse } from 'next/server';
import { getMockEmailLog, resetMockEmailLog } from '@/lib/email/provider';

function ensureMockMode() {
  return process.env.EMAIL_PROVIDER?.trim().toLowerCase() === 'mock';
}

export async function GET() {
  if (!ensureMockMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ emails: getMockEmailLog() });
}

export async function DELETE() {
  if (!ensureMockMode()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  resetMockEmailLog();
  return NextResponse.json({ success: true });
}
