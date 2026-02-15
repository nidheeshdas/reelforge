'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PreviewEngine } from '@/lib/preview/engine';
import { parseVidscript } from '@/parser';

interface PreviewPlayerProps {
  code: string;
  width?: number;
  height?: number;
}

export function PreviewPlayer({ code, width = 360, height = 640 }: PreviewPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PreviewEngine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const initPreview = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = parseVidscript(code);
        
        if (result.errors.length > 0) {
          setError(result.errors[0].message);
          return;
        }
        
        if (!result.ast) {
          setError('Failed to parse code');
          return;
        }
        
        if (engineRef.current) {
          engineRef.current.dispose();
        }
        
        const engine = new PreviewEngine({
          width,
          height,
          container: containerRef.current!,
        });
        
        engineRef.current = engine;
        
        let maxDuration = 10;
        
        for (const stmt of result.ast.statements || []) {
          if (stmt.type === 'Input' && stmt.path) {
            const ext = stmt.path.split('.').pop()?.toLowerCase();
            if (ext === 'mp4' || ext === 'webm' || ext === 'mov') {
              try {
                await engine.loadVideo(stmt.path, stmt.name);
                const videoEl = engine.getVideoTexture(stmt.name)?.image;
                if (videoEl instanceof HTMLVideoElement) {
                  maxDuration = Math.max(maxDuration, videoEl.duration || 10);
                }
              } catch (e) {
                console.warn(`Failed to load video ${stmt.path}:`, e);
              }
            }
          }
          
          if (stmt.type === 'TimeBlock') {
            if (stmt.end?.value && stmt.end.value !== Infinity) {
              maxDuration = Math.max(maxDuration, stmt.end.value);
            }
          }
        }
        
        setDuration(maxDuration);
        engine.setOnTimeUpdate((time) => {
          setCurrentTime(time);
        });
        
        for (const stmt of result.ast.statements || []) {
          if (stmt.type === 'TimeBlock') {
            for (const instruction of stmt.instructions || []) {
              if (instruction.type === 'Filter' && instruction.name) {
                engine.applyFilter(instruction.name, instruction.params || {});
              }
              
              if (instruction.type === 'Text' && instruction.content) {
                const params = instruction.params || {};
                engine.addText(instruction.content, {
                  x: params.position?.includes('left') ? 20 : params.position?.includes('right') ? width - 200 : undefined,
                  y: params.position?.includes('top') ? 20 : params.position?.includes('bottom') ? height - 80 : undefined,
                  fontSize: params.size ? Number(params.size) * 2 : undefined,
                  color: params.color || 'white',
                });
              }
            }
          }
        }
        
        engine.render();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview failed');
      } finally {
        setIsLoading(false);
      }
    };
    
    initPreview();
    
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, [code, width, height]);
  
  const togglePlay = useCallback(() => {
    if (!engineRef.current) return;
    
    if (isPlaying) {
      engineRef.current.pause();
    } else {
      engineRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);
  
  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    engineRef.current?.seek(time);
    setCurrentTime(time);
  }, []);
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="preview-player">
      <div
        ref={containerRef}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          background: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isLoading && <div style={{ color: '#fff' }}>Loading...</div>}
        {error && (
          <div style={{ color: '#ff4444', padding: '1rem', textAlign: 'center' }}>
            {error}
          </div>
        )}
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
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
