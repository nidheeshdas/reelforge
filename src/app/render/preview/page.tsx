'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { PreviewEngine } from '@/lib/preview/engine';
import { applyCompositionState, buildComposition, type BuiltComposition } from '@/lib/preview/composition';

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

export default function RenderPreviewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const compositionRef = useRef<BuiltComposition | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);

  const seekTo = useCallback(async (time: number) => {
    setCurrentTime(time);
    if (engineRef.current) {
      await engineRef.current.seekTo(time);
      return { time: engineRef.current.getCurrentTime() };
    }

    return { time };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') || '';
    const width = parseInt(params.get('width') || '1080', 10);
    const height = parseInt(params.get('height') || '1920', 10);

    let engine: PreviewEngine | null = null;
    let mounted = true;

    const init = async () => {
      try {
        setStatus('loading');

        if (!containerRef.current) {
          throw new Error('Container not available');
        }

        engine = new PreviewEngine({
          width,
          height,
          container: containerRef.current,
        });

        engine.setOnTimeUpdate((time) => {
          if (mounted) {
            setCurrentTime(time);
          }
        });

        if (!mounted) return;

        engineRef.current = engine;
        compositionRef.current = null;

        try {
          console.log('[RenderPreviewPage] Initializing composition', { width, height });
          const built = await buildComposition(engine, code, width, height);
          compositionRef.current = built;
          engine.setCompositionDuration(built.duration);
          engine.setFrameUpdater((time) => {
            const activeEngine = engineRef.current;
            const activeComposition = compositionRef.current;
            if (!activeEngine || !activeComposition) return;
            applyCompositionState(activeEngine, activeComposition, time);
          });

          if (!mounted) return;

          setDuration(built.duration);
          await engine.seekTo(0);
          setCurrentTime(0);
          console.log('[RenderPreviewPage] Ready', {
            duration: built.duration,
            overlays: built.overlays.length,
            videoClips: built.videoClips.length,
          });

          await new Promise((resolve) => setTimeout(resolve, 300));
          setStatus('ready');
        } catch (e) {
          console.error('[RenderPreviewPage] Composition failed', e);
          if (!mounted) return;
          setError(e instanceof Error ? e.message : 'Preview failed');
          setStatus('error');
        }
      } catch (e) {
        console.error('[RenderPreviewPage] Init failed', e);
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Preview failed');
        setStatus('error');
      }
    };

    void init();

    return () => {
      mounted = false;
      if (engine) {
        engine.dispose();
      }
      engineRef.current = null;
      compositionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const handleSeek = (e: CustomEvent<{ time: number }>) => {
      void seekTo(e.detail.time);
    };

    window.addEventListener('seek-to', handleSeek as EventListener);
    return () => {
      window.removeEventListener('seek-to', handleSeek as EventListener);
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
        onChange={(e) => {
          void seekTo(parseFloat(e.target.value));
        }}
      />
    </div>
  );
}
