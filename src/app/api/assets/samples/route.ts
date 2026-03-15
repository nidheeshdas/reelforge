import { NextResponse } from 'next/server';

export async function GET() {
  const sampleAssets = [
    {
      id: 1,
      filename: 'test-video.mp4',
      filepath: '/samples/test-video.mp4',
      fileType: 'video',
      fileSize: 1024000,
      source: 'samples',
    },
    {
      id: 2,
      filename: 'test-audio.mp3',
      filepath: '/samples/test-audio.mp3',
      fileType: 'audio',
      fileSize: 512000,
      source: 'samples',
    },
  ];

  return NextResponse.json({ assets: sampleAssets });
}
