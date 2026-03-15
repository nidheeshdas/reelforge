'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { applyCompositionState, buildComposition, type BuiltComposition } from './composition';
import { PreviewEngine } from './engine';

interface PreviewPlayerProps {
  code: string;
  width?: number;
  height?: number;
}

export function PreviewPlayer({ code, width = 360, height = 640 }: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const compositionRef = useRef<BuiltComposition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [engineReady, setEngineReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    let engine: PreviewEngine;
    try {
      engine = new PreviewEngine({
        width,
        height,
        container: containerRef.current,
      });
    } catch (e) {
      console.error('[PreviewPlayer] Failed to initialize engine', e);
      setError(e instanceof Error ? e.message : 'Preview failed');
      setEngineReady(false);
      return;
    }

    engine.setOnTimeUpdate((time) => {
      setCurrentTime(time);
    });

    engineRef.current = engine;
    setError(null);
    setEngineReady(true);

    return () => {
      engine.dispose();
      engineRef.current = null;
      compositionRef.current = null;
      setEngineReady(false);
    };
  }, [width, height]);

  useEffect(() => {
    if (!engineReady || !engineRef.current) return;

    const loadPreview = async () => {
      const engine = engineRef.current;
      if (!engine) return;

      setIsLoading(true);
      setError(null);
      setCurrentTime(0);
      setIsPlaying(false);

      engine.resetComposition();
      compositionRef.current = null;

      try {
        const built = await buildComposition(engine, code, width, height);
        compositionRef.current = built;
        engine.setCompositionDuration(built.duration);
        engine.setFrameUpdater((time) => {
          const activeEngine = engineRef.current;
          const activeComposition = compositionRef.current;
          if (!activeEngine || !activeComposition) return;
          applyCompositionState(activeEngine, activeComposition, time);
        });
        await engine.seekTo(0);
        setDuration(built.duration);
        setCurrentTime(0);
        setIsLoading(false);
      } catch (e) {
        console.error('[PreviewPlayer] Failed to load composition', e);
        setError(e instanceof Error ? e.message : 'Preview failed');
        setIsLoading(false);
      }
    };

    void loadPreview();
  }, [code, width, height, engineReady]);

  useEffect(() => {
    if (!engineReady) {
      setIsPlaying(false);
    }
  }, [engineReady]);

  useEffect(() => {
    if (currentTime >= duration) {
      setIsPlaying(false);
    }
  }, [currentTime, duration]);

  const togglePlay = useCallback(() => {
    if (!engineRef.current) return;

    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play();
    }

    console.log('[PreviewPlayer] Toggle play', { nextIsPlaying: !isPlaying, currentTime });
    setIsPlaying(!isPlaying);
  }, [isPlaying, currentTime]);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    console.log('[PreviewPlayer] Seek', { time });
    setCurrentTime(time);
    if (engineRef.current) {
      void engineRef.current.seekTo(time);
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="preview-player">
      <div
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {isLoading && <div style={{ color: '#fff' }}>Loading...</div>}
        {error && (
          <div style={{ color: '#ff4444', padding: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      <div style={{ padding: '0.5rem', background: '#1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            onClick={togglePlay}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            {formatTime(currentTime)} / {formatTime(duration || 30)}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={duration || 30}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
