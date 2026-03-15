'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { validateVidscript, extractPlaceholders } from '@/parser';
import { PreviewPlayer } from '@/lib/preview/PreviewPlayer';
import { LLMChat } from '@/lib/llm/Chat';
import { AssetLibrary } from '@/components/AssetLibrary';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Clapperboard, Eye, Download, Sparkles, CircleCheck, CircleAlert, FolderOpen, Code2 } from 'lucide-react';
import { extractRenderScriptConfig } from '@/render/render-config';

const DEFAULT_CODE = `# Welcome to ReelForge!
# Write your video script here

# === INPUTS ===
# Using sample files from public/samples folder
input main_video = "/samples/test-video.mp4"
input music = "/samples/test-audio.mp3"

# === VIDEO ===
# Trim to 30 seconds
[0s - 30s] = main_video.Trim(0, 30)

# === AUDIO ===
[0s - 30s] = audio music, volume: 0.6, fade_out: 2

# === TEXT ===
[2s - 5s] = text "My Reel", 
    style: title, 
    position: center

# === OUTPUT ===
output to "output.mp4", resolution: 1080x1920
`;

export default function EditorPage() {
  const { data: session } = useSession();
  const [code, setCode] = useState(DEFAULT_CODE);
  const [previewCode, setPreviewCode] = useState(DEFAULT_CODE);
  const [errors, setErrors] = useState<string[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [sidebarTab, setSidebarTab] = useState('editor');
  const [previewNonce, setPreviewNonce] = useState(0);
  const pollIntervalRef = useRef<number | null>(null);

  const draftRenderConfig = useMemo(() => extractRenderScriptConfig(code), [code]);
  const previewRenderConfig = useMemo(() => extractRenderScriptConfig(previewCode), [previewCode]);
  const previewNeedsRefresh = code !== previewCode;
  const previewUrl = useMemo(
    () => `/render/preview?code=${encodeURIComponent(previewCode)}&width=${previewRenderConfig.resolution.width}&height=${previewRenderConfig.resolution.height}`,
    [previewCode, previewRenderConfig.resolution.height, previewRenderConfig.resolution.width]
  );
  const previewDimensions = useMemo(() => {
    const maxWidth = 420;
    const maxHeight = 640;
    const scale = Math.min(
      maxWidth / previewRenderConfig.resolution.width,
      maxHeight / previewRenderConfig.resolution.height
    );

    return {
      width: Math.max(180, Math.round(previewRenderConfig.resolution.width * scale)),
      height: Math.max(180, Math.round(previewRenderConfig.resolution.height * scale)),
    };
  }, [previewRenderConfig.resolution.height, previewRenderConfig.resolution.width]);

  const clearRenderPoll = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const imported = localStorage.getItem('vidscript_import');
    if (imported) {
      const validation = validateVidscript(imported);
      setCode(imported);
      if (validation.errors.length === 0) {
        setPreviewCode(imported);
        setPreviewNonce((value) => value + 1);
      }
      setErrors(validation.errors);
      setPlaceholders(extractPlaceholders(imported));
      localStorage.removeItem('vidscript_import');
    }
  }, []);

  useEffect(() => {
    return () => {
      clearRenderPoll();
    };
  }, [clearRenderPoll]);

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

    setErrors([]);
    setPreviewCode(code);
    setPreviewNonce((value) => value + 1);
  }, [code]);

  const handleInsertAsset = useCallback((assetPath: string) => {
    const newLine = code.endsWith('\n') ? '' : '\n';
    const next = `${code}${newLine}input asset_${Date.now()} = "${assetPath}"\n`;
    setCode(next);
    setSidebarTab('editor');
  }, [code]);

  const handleExport = useCallback(async () => {
    const validation = validateVidscript(code);
    if (validation.errors.length > 0) {
      setErrors(validation.errors);
      return;
    }

    setRendering(true);
    setRenderProgress(0);
    setErrors([]);
    clearRenderPoll();

    if (previewNeedsRefresh) {
      setPreviewCode(code);
      setPreviewNonce((value) => value + 1);
    }

    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vidscript: code, resolution: draftRenderConfig.resolutionKey }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to start render');
      }

      const { renderId, outputFilename: initialOutputFilename } = await response.json();

      pollIntervalRef.current = window.setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/render?id=${renderId}`);
          const status = await statusResponse.json().catch(() => null);

          if (!statusResponse.ok) {
            throw new Error(status?.error || 'Status check failed');
          }

          setRenderProgress(status.progress || 0);

          if (status.status === 'completed') {
            clearRenderPoll();
            setRendering(false);

            const downloadResponse = await fetch(status.downloadUrl || `/api/render/download?id=${renderId}`);
            if (!downloadResponse.ok) {
              const payload = await downloadResponse.json().catch(() => null);
              throw new Error(payload?.error || 'Failed to download video');
            }

            const blob = await downloadResponse.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const headerFilename = downloadResponse.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1];
            a.href = url;
            a.download = headerFilename || status.outputFilename || initialOutputFilename || draftRenderConfig.outputFilename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          } else if (status.status === 'failed') {
            clearRenderPoll();
            setRendering(false);
            setErrors([status.error || 'Render failed']);
          }
        } catch (pollErr) {
          clearRenderPoll();
          setRendering(false);
          setErrors([pollErr instanceof Error ? pollErr.message : 'Status check failed']);
        }
      }, 2000);
    } catch (err) {
      clearRenderPoll();
      setRendering(false);
      setErrors([err instanceof Error ? err.message : 'Export failed']);
    }
  }, [clearRenderPoll, code, draftRenderConfig.outputFilename, draftRenderConfig.resolutionKey, previewNeedsRefresh]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#090f1a', color: '#dbe7ff' }}>
      <aside style={{ width: '320px', borderRight: '1px solid #1f2c46', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #0d1628 0%, #0b1220 100%)' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #1f2c46', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#e4edff', textDecoration: 'none', fontWeight: 700 }}>
              <ArrowLeft size={16} />
              ReelForge
            </Link>
            <span style={{ fontSize: '0.75rem', color: '#7e95bf', border: '1px solid #2d4064', borderRadius: 999, padding: '0.2rem 0.55rem' }}>Editor v2</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: errors.length ? '#fca5a5' : '#89d18a' }}>
            {errors.length ? <CircleAlert size={14} /> : <CircleCheck size={14} />}
            {errors.length ? `${errors.length} syntax issue${errors.length > 1 ? 's' : ''}` : 'Script valid'}
          </div>
          {session && (
            <Link href="/account" style={{ fontSize: '0.82rem', color: '#8fb1ff', textDecoration: 'none' }}>
              Account settings
            </Link>
          )}
        </div>

        <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 mx-4 mt-3" style={{ background: '#101d33', border: '1px solid #243656' }}>
            <TabsTrigger value="editor"><Code2 className="h-3 w-3 mr-1" />Editor</TabsTrigger>
            <TabsTrigger value="assets"><FolderOpen className="h-3 w-3 mr-1" />Assets</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 overflow-auto m-0 p-4 pt-2 space-y-4">
            <div style={{ border: '1px solid #2a3d5f', borderRadius: 12, padding: '0.9rem', background: '#0f1a2e' }}>
              <h3 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: '#b8ccf0' }}>Actions</h3>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <Button onClick={handlePreview} variant="secondary" className="w-full" style={{ background: '#1a2d4d', color: '#dbe7ff', border: '1px solid #2f4a73' }}>
                  <Eye className="h-4 w-4 mr-2" />
                  {previewNeedsRefresh ? 'Refresh Preview' : 'Preview Ready'}
                </Button>
                <Button onClick={handleExport} className="w-full" disabled={rendering} style={{ background: '#2457ff', color: 'white' }}>
                  <Download className="h-4 w-4 mr-2" />
                  {rendering ? `Rendering ${renderProgress}%...` : 'Export MP4'}
                </Button>
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#8aa4d4' }}>
                Output: {draftRenderConfig.outputFilename} · {draftRenderConfig.resolutionKey}
              </div>
              <div style={{ marginTop: '0.35rem' }}>
                <Link
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.78rem', color: '#8fb1ff', textDecoration: 'none' }}
                >
                  Open render preview page
                </Link>
              </div>
              {rendering && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ height: 8, borderRadius: 999, background: '#1b2a45', overflow: 'hidden' }}>
                    <div style={{ width: `${renderProgress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)' }} />
                  </div>
                </div>
              )}
            </div>

            {placeholders.length > 0 && (
              <div style={{ border: '1px solid #2a3d5f', borderRadius: 12, padding: '0.9rem', background: '#0f1a2e' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#b8ccf0' }}>Placeholders</h3>
                {placeholders.map((p) => (
                  <div key={p} style={{ fontSize: '0.82rem', padding: '0.25rem 0', color: '#9db5df' }}>
                    {`{{${p}}}`}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assets" className="flex-1 overflow-hidden m-0 p-0">
            <AssetLibrary onInsertAsset={handleInsertAsset} />
          </TabsContent>
        </Tabs>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 62, borderBottom: '1px solid #1f2c46', background: 'linear-gradient(90deg, #0d1628, #0f1b30)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #2563eb, #38bdf8)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clapperboard size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#e4edff', lineHeight: 1.1 }}>Video Orchestrator</div>
              <div style={{ fontSize: '0.78rem', color: '#88a2cf' }}>WebGL preview + export pipeline</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#9ab0d7' }}>
            <Sparkles size={14} />
            {previewNeedsRefresh ? 'Preview out of date' : 'Preview refreshed'}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
            <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid #1f2c46', background: '#0d172b', color: '#c6d8fb' }}>
              <span style={{ fontWeight: 500 }}>VidScript Editor</span>
            </div>
            <textarea
              value={code}
              onChange={handleCodeChange}
              style={{
                flex: 1,
                padding: '1rem',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace',
                fontSize: '0.875rem',
                border: 'none',
                resize: 'none',
                outline: 'none',
                background: '#081222',
                color: '#d7e5ff',
                lineHeight: 1.6,
              }}
              spellCheck={false}
            />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.55rem 1rem', borderBottom: '1px solid #1f2c46', background: '#0d172b', color: '#c6d8fb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500 }}>Preview</span>
              <span style={{ fontSize: '0.75rem', color: '#88a2cf' }}>
                {previewRenderConfig.resolutionKey}
              </span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 30% 20%, #172f58 0%, #0a1325 45%, #070d18 100%)', position: 'relative' }}>
              <PreviewPlayer
                key={previewNonce}
                code={previewCode}
                width={previewDimensions.width}
                height={previewDimensions.height}
              />
              {errors.length > 0 && (
                <div style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(35, 16, 24, 0.88)', border: '1px solid #7f1d1d', color: '#fecaca', padding: '0.55rem 0.7rem', borderRadius: 10, fontSize: '0.78rem' }}>
                  Preview shows the last valid script.
                </div>
              )}
            </div>
          </div>
        </div>

        {errors.length > 0 && (
          <div style={{ padding: '1rem', borderTop: '1px solid #3f2330', background: '#231018' }}>
            <h4 style={{ color: '#fca5a5', marginBottom: '0.5rem' }}>Errors</h4>
            {errors.map((err, i) => (
              <div key={i} style={{ color: '#fecaca', fontSize: '0.875rem' }}>
                {err}
              </div>
            ))}
          </div>
        )}
      </main>

      <LLMChat
        onInsertCode={(newCode) => {
          setCode(newCode);
          setErrors(validateVidscript(newCode).errors);
          setPlaceholders(extractPlaceholders(newCode));
        }}
        apiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY}
      />
    </div>
  );
}
