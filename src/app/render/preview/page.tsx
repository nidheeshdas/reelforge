'use client';

import { Suspense, useCallback, useEffect, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePreviewRuntime } from '@/lib/preview/runtime';

declare global {
  interface Window {
    __REELFORGE_RENDER_PREVIEW__?: {
      seekTo: (time: number) => Promise<{ time: number }>;
      getState: () => {
        status: 'loading' | 'ready' | 'error';
        duration: number;
        currentTime: number;
        error: string | null;
      };
    };
  }
}

export const dynamic = 'force-dynamic';

function RenderPreviewPageContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const width = useMemo(() => parseInt(searchParams.get('width') || '1080', 10), [searchParams]);
  const height = useMemo(() => parseInt(searchParams.get('height') || '1920', 10), [searchParams]);
  const {
    containerRef,
    status,
    error,
    duration,
    currentTime,
    seekTo,
  } = usePreviewRuntime({ code, width, height });

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    void seekTo(parseFloat(e.target.value));
  }, [seekTo]);

  useEffect(() => {
    const handleSeekEvent = (e: CustomEvent<{ time: number }>) => {
      void seekTo(e.detail.time);
    };

    window.addEventListener('seek-to', handleSeekEvent as EventListener);
    return () => {
      window.removeEventListener('seek-to', handleSeekEvent as EventListener);
    };
  }, [seekTo]);

  useEffect(() => {
    window.__REELFORGE_RENDER_PREVIEW__ = {
      seekTo,
      getState: () => ({
        status,
        duration,
        currentTime,
        error,
      }),
    };

    return () => {
      delete window.__REELFORGE_RENDER_PREVIEW__;
    };
  }, [currentTime, duration, error, seekTo, status]);

  return (
    <div style={{ background: '#000', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div
        id="render-canvas"
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />
      <div data-status={status} style={{ display: 'none' }} />
      <div data-ready={status === 'ready' ? 'true' : 'false'} style={{ display: 'none' }} />
      <div data-duration={duration} style={{ display: 'none' }} />
      <div data-current-time={currentTime} style={{ display: 'none' }} />
      {error && (
        <div
          data-error="true"
          style={{
            color: '#ff4444',
            padding: '1rem',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 10,
          }}
        >
          {error}
        </div>
      )}
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={currentTime}
        style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', opacity: 0 }}
        onChange={handleSeek}
      />
    </div>
  );
}

export default function RenderPreviewPage() {
  return (
    <Suspense fallback={<div style={{ background: '#000', width: '100vw', height: '100vh' }} />}>
      <RenderPreviewPageContent />
    </Suspense>
  );
}
