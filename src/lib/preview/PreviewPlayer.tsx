'use client';

import { useCallback } from 'react';
import type { ChangeEvent } from 'react';
import { usePreviewRuntime } from './runtime';

interface PreviewPlayerProps {
  code: string;
  width?: number;
  height?: number;
}

export function PreviewPlayer({ code, width = 360, height = 640 }: PreviewPlayerProps) {
  const {
    containerRef,
    error,
    isLoading,
    isPlaying,
    currentTime,
    duration,
    isReady,
    seekTo,
    play,
    pause,
  } = usePreviewRuntime({
    code,
    width,
    height,
    initialDuration: 30,
  });

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }

    play();
  }, [isPlaying, pause, play]);

  const handleSeek = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    void seekTo(parseFloat(e.target.value));
  }, [seekTo]);

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
            disabled={!isReady}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: 'white',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              cursor: isReady ? 'pointer' : 'not-allowed',
              opacity: isReady ? 1 : 0.6,
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
          disabled={!isReady}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
