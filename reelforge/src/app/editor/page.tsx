'use client';

import { useState, useCallback } from 'react';
import { parseVidscript, validateVidscript, extractPlaceholders } from '@/parser';
import Link from 'next/link';

const DEFAULT_CODE = `# Welcome to ReelForge!
# Write your video script here

# === INPUTS ===
input main_video = "video.mp4"
input music = "song.mp3"

# === VIDEO ===
# Trim to 30 seconds and apply filter
[0s - 30s] = main_video.Trim(0, 30)
[0s - 30s] = filter "sepia", intensity: 0.4

# === AUDIO ===
[0s - 30s] = audio music, volume: 0.6, fade_out: 2s

# === TEXT ===
[2s - 5s] = text "My Reel", 
    style: title, 
    position: center

# === OUTPUT ===
output to "output.mp4", resolution: 1080x1920
`;

export default function EditorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    
    const validation = validateVidscript(newCode);
    setErrors(validation.errors);
    
    const placeholdersFound = extractPlaceholders(newCode);
    setPlaceholders(placeholdersFound);
  }, []);

  const handlePreview = useCallback(() => {
    const validation = validateVidscript(code);
    if (validation.errors.length > 0) {
      setErrors(validation.errors);
      return;
    }
    
    setPreviewUrl('/preview?code=' + encodeURIComponent(code));
  }, [code]);

  const handleExport = useCallback(async () => {
    const validation = validateVidscript(code);
    if (validation.errors.length > 0) {
      setErrors(validation.errors);
      return;
    }
    
    setRendering(true);
    setRenderProgress(0);
    
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vidscript: code, resolution: '1080x1920' }),
      });
      
      if (!response.ok) throw new Error('Failed to start render');
      
      const { renderId } = await response.json();
      
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/render/${renderId}`);
        const status = await statusResponse.json();
        
        setRenderProgress(status.progress);
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setRendering(false);
          setPreviewUrl(status.outputUrl);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setRendering(false);
          setErrors([status.error]);
        }
      }, 1000);
    } catch (err) {
      setRendering(false);
      setErrors([err instanceof Error ? err.message : 'Export failed']);
    }
  }, [code]);

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: '300px', borderRight: '1px solid var(--border)', padding: '1rem', overflow: 'auto' }}>
        <Link href="/" style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'block', marginBottom: '1rem' }}>
          ← ReelForge
        </Link>
        
        <div style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Actions</h3>
          <button onClick={handlePreview} className="btn btn-secondary" style={{ width: '100%', marginBottom: '0.5rem' }}>
            Preview
          </button>
          <button 
            onClick={handleExport} 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={rendering}
          >
            {rendering ? `Rendering ${renderProgress}%...` : 'Export'}
          </button>
        </div>
        
        {placeholders.length > 0 && (
          <div>
            <h3 style={{ marginBottom: '0.5rem' }}>Placeholders</h3>
            {placeholders.map((p) => (
              <div key={p} style={{ fontSize: '0.875rem', padding: '0.25rem 0' }}>
                {`{{${p}}}`}
              </div>
            ))}
          </div>
        )}
      </aside>
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
              <span style={{ fontWeight: 500 }}>VidScript Editor</span>
            </div>
            <textarea
              value={code}
              onChange={handleCodeChange}
              style={{
                flex: 1,
                padding: '1rem',
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                border: 'none',
                resize: 'none',
                outline: 'none',
                background: '#1e293b',
                color: '#e2e8f0',
                lineHeight: 1.6,
              }}
              spellCheck={false}
            />
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid var(--border)', background: '#f8fafc' }}>
              <span style={{ fontWeight: 500 }}>Preview</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
              {previewUrl ? (
                <video 
                  src={previewUrl} 
                  controls 
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <span style={{ color: '#64748b' }}>Click Preview to see result</span>
              )}
            </div>
          </div>
        </div>
        
        {errors.length > 0 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: '#fef2f2' }}>
            <h4 style={{ color: 'var(--error)', marginBottom: '0.5rem' }}>Errors</h4>
            {errors.map((err, i) => (
              <div key={i} style={{ color: 'var(--error)', fontSize: '0.875rem' }}>
                {err}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
