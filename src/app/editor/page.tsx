'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { validateVidscript, extractPlaceholders } from '@/parser';
import { PreviewPlayer } from '@/lib/preview/PreviewPlayer';
import { LLMChat } from '@/lib/llm/Chat';
import { AssetLibrary } from '@/components/AssetLibrary';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Clapperboard, Eye, Download, Sparkles, FolderOpen, Code2 } from 'lucide-react';
import {
  extractRenderScriptConfig,
  RENDER_RESOLUTIONS,
  sanitizeDownloadFilename,
  type RenderScriptConfig,
} from '@/render/render-config';
import { type TemplateStatusValue } from '@/lib/templates/status';

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

const CANVAS_PRESETS = [
  { key: '1080x1920', label: 'Reel', ratio: '9:16' },
  { key: '1080x1080', label: 'Square', ratio: '1:1' },
  { key: '1920x1080', label: 'Landscape', ratio: '16:9' },
];

const MIN_CANVAS_SIZE = 64;
const MAX_CANVAS_SIZE = 3840;
const MAX_CANVAS_PIXELS = 8_294_400;

interface ProjectSettingsForm {
  outputFilename: string;
  width: string;
  height: string;
}

interface TemplateSaveForm {
  title: string;
  description: string;
  category: string;
  tags: string;
  status: TemplateStatusValue;
}

interface TemplateSaveNotice {
  tone: 'success' | 'error';
  title: string;
  description: string;
}

const DEFAULT_TEMPLATE_STATUS: TemplateStatusValue = 'draft';
const TEMPLATE_STATUS_OPTIONS: Array<{
  value: TemplateStatusValue;
  label: string;
  description: string;
}> = [
  {
    value: 'draft',
    label: 'Draft',
    description: 'Private working copy. Visible only to you until you deliberately publish or share it later.',
  },
  {
    value: 'private',
    label: 'Private',
    description: 'Saved for your account but kept off any public template listings.',
  },
  {
    value: 'public',
    label: 'Public',
    description: 'Explicitly publish this template so other users can discover it.',
  },
];

function readProjectSettingsFromForm(form: HTMLFormElement): ProjectSettingsForm {
  const formData = new FormData(form);

  return {
    outputFilename: String(formData.get('outputFilename') ?? ''),
    width: String(formData.get('canvasWidth') ?? ''),
    height: String(formData.get('canvasHeight') ?? ''),
  };
}

function buildSuggestedTemplateTitle(outputFilename: string): string {
  const cleaned = sanitizeDownloadFilename(outputFilename)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Untitled Template';
  }

  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function trimOptionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseTemplateTags(value: string): string[] | undefined {
  const tags = Array.from(
    new Set(
      value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  ).slice(0, 25);

  return tags.length > 0 ? tags : undefined;
}

function buildPlaceholderLabel(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTemplatePlaceholders(names: string[]) {
  return Array.from(new Set(names)).map((name) => ({
    name,
    label: buildPlaceholderLabel(name),
    type: 'text',
    required: false,
  }));
}

async function readApiError(response: Response, fallback: string) {
  try {
    const data: unknown = await response.json();

    if (
      typeof data === 'object' &&
      data !== null &&
      'details' in data &&
      typeof (data as { details?: unknown }).details === 'object' &&
      (data as { details?: unknown }).details !== null
    ) {
      const details = (data as {
        details?: {
          formErrors?: string[];
          fieldErrors?: Record<string, string[] | undefined>;
        };
      }).details;
      const formError = details.formErrors?.find(Boolean);
      if (formError) {
        return formError;
      }

      const fieldError = Object.values(details.fieldErrors ?? {})
        .flat()
        .find(Boolean);
      if (fieldError) {
        return fieldError;
      }
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
    ) {
      return (data as { error: string }).error;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function readProjectSettingsForm(
  vidscript: string,
  fallback: RenderScriptConfig,
): ProjectSettingsForm {
  const outputLine = vidscript
    .split(/\r?\n/)
    .find((line) => /^\s*output\s+to\s+/i.test(line));

  const filenameMatch = outputLine?.match(/output\s+to\s+"([^"]+)"/i);
  const resolutionMatch = outputLine?.match(/resolution\s*:\s*(\d+)(?:x(\d+))?/i);

  return {
    outputFilename: filenameMatch?.[1] || fallback.outputFilename,
    width: resolutionMatch?.[1] || String(fallback.resolution.width),
    height: resolutionMatch?.[2] || String(fallback.resolution.height),
  };
}

function upsertOutputStatement(
  vidscript: string,
  settings: { outputFilename: string; width: number; height: number },
): string {
  const outputLinePattern = /^\s*output\s+to\s+"[^"]*".*$/im;
  const existingLine = vidscript.match(outputLinePattern)?.[0] || null;
  const nextFilename = sanitizeDownloadFilename(settings.outputFilename);
  const nextResolution = `${settings.width}x${settings.height}`;

  if (!existingLine) {
    const trimmed = vidscript.replace(/\s*$/, '');
    return `${trimmed}\n\noutput to "${nextFilename}", resolution: ${nextResolution}\n`;
  }

  const withFilename = existingLine.replace(
    /output\s+to\s+"[^"]*"/i,
    `output to "${nextFilename}"`,
  );
  const nextLine = /resolution\s*:\s*\d+(?:x\d+)?/i.test(withFilename)
    ? withFilename.replace(/resolution\s*:\s*\d+(?:x\d+)?/i, `resolution: ${nextResolution}`)
    : `${withFilename}, resolution: ${nextResolution}`;

  return vidscript.replace(existingLine, nextLine);
}

export default function EditorPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [previewCode, setPreviewCode] = useState(DEFAULT_CODE);
  const [errors, setErrors] = useState<string[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [sidebarTab, setSidebarTab] = useState('editor');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [projectSettings, setProjectSettings] = useState<ProjectSettingsForm>(() =>
    readProjectSettingsForm(DEFAULT_CODE, extractRenderScriptConfig(DEFAULT_CODE)),
  );
  const [projectSettingsError, setProjectSettingsError] = useState<string | null>(null);
  const [projectSettingsNotice, setProjectSettingsNotice] = useState<string | null>(null);
  const [templateSaveForm, setTemplateSaveForm] = useState<TemplateSaveForm>(() => ({
    title: buildSuggestedTemplateTitle(readProjectSettingsForm(DEFAULT_CODE, extractRenderScriptConfig(DEFAULT_CODE)).outputFilename),
    description: '',
    category: '',
    tags: '',
    status: DEFAULT_TEMPLATE_STATUS,
  }));
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSaveNotice, setTemplateSaveNotice] = useState<TemplateSaveNotice | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const projectSettingsFormRef = useRef<HTMLFormElement | null>(null);
  const templateTitleInputRef = useRef<HTMLInputElement | null>(null);

  const draftRenderConfig = useMemo(() => extractRenderScriptConfig(code), [code]);
  const previewRenderConfig = useMemo(() => extractRenderScriptConfig(previewCode), [previewCode]);
  const previewNeedsRefresh = code !== previewCode;
  const projectSettingsFromCode = useMemo(
    () => readProjectSettingsForm(code, draftRenderConfig),
    [code, draftRenderConfig],
  );
  const selectedCanvasPreset = `${projectSettings.width}x${projectSettings.height}`;
  const previewUrl = useMemo(
    () => `/render/preview?code=${encodeURIComponent(previewCode)}&width=${previewRenderConfig.resolution.width}&height=${previewRenderConfig.resolution.height}`,
    [previewCode, previewRenderConfig.resolution.height, previewRenderConfig.resolution.width],
  );
  const previewDimensions = useMemo(() => {
    const maxWidth = 420;
    const maxHeight = 640;
    const scale = Math.min(
      maxWidth / previewRenderConfig.resolution.width,
      maxHeight / previewRenderConfig.resolution.height,
    );

    return {
      width: Math.max(180, Math.round(previewRenderConfig.resolution.width * scale)),
      height: Math.max(180, Math.round(previewRenderConfig.resolution.height * scale)),
    };
  }, [previewRenderConfig.resolution.height, previewRenderConfig.resolution.width]);
  const compactStatusText = errors.length
    ? `${errors.length} issue${errors.length > 1 ? 's' : ''}`
    : previewNeedsRefresh
      ? 'Preview stale'
      : 'Ready';
  const outputSummaryText = `${sanitizeDownloadFilename(projectSettingsFromCode.outputFilename)} · ${projectSettingsFromCode.width} × ${projectSettingsFromCode.height}`;
  const previewActionTitle = errors.length
    ? 'Fix script errors before refreshing the preview.'
    : previewNeedsRefresh
      ? 'Refresh the preview with the latest valid VidScript and canvas settings.'
      : 'Rebuild the preview with the current VidScript and canvas settings.';
  const exportActionTitle = errors.length
    ? 'Resolve script errors before exporting.'
    : 'Export an MP4 using the current output filename and canvas size.';
  const saveTemplateActionTitle = errors.length
    ? 'Fix script errors before saving this script as a template.'
    : 'Capture template metadata and save the current VidScript to your library.';

  const applyDraftCode = useCallback((nextCode: string) => {
    const validation = validateVidscript(nextCode);
    setCode(nextCode);
    setErrors(validation.errors);
    setPlaceholders(extractPlaceholders(nextCode));
    return validation;
  }, []);
  const syncPreview = useCallback((nextCode: string) => {
    setPreviewCode(nextCode);
    setPreviewNonce((value) => value + 1);
  }, []);

  const clearRenderPoll = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    const imported = localStorage.getItem('vidscript_import');
    if (imported) {
      const validation = applyDraftCode(imported);
      setProjectSettingsError(null);
      setProjectSettingsNotice(null);
      if (validation.errors.length === 0) {
        syncPreview(imported);
      }
      localStorage.removeItem('vidscript_import');
    }
  }, [applyDraftCode, syncPreview]);

  useEffect(() => {
    return () => {
      clearRenderPoll();
    };
  }, [clearRenderPoll]);

  useEffect(() => {
    setProjectSettings(projectSettingsFromCode);
  }, [projectSettingsFromCode]);

  useEffect(() => {
    if (draftRenderConfig.resolutionKey === previewRenderConfig.resolutionKey) {
      return;
    }

    const validation = validateVidscript(code);
    if (validation.errors.length > 0) {
      return;
    }

    syncPreview(code);
  }, [code, draftRenderConfig.resolutionKey, previewRenderConfig.resolutionKey, syncPreview]);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setProjectSettingsError(null);
    setProjectSettingsNotice(null);
    applyDraftCode(e.target.value);
  }, [applyDraftCode]);

  const handlePreview = useCallback(() => {
    const validation = validateVidscript(code);
    if (validation.errors.length > 0) {
      setErrors(validation.errors);
      return;
    }

    setErrors([]);
    syncPreview(code);
  }, [code, syncPreview]);

  const handleInsertAsset = useCallback((assetPath: string) => {
    const newLine = code.endsWith('\n') ? '' : '\n';
    const next = `${code}${newLine}input asset_${Date.now()} = "${assetPath}"\n`;
    setProjectSettingsError(null);
    setProjectSettingsNotice(null);
    applyDraftCode(next);
    setSidebarTab('editor');
  }, [applyDraftCode, code]);

  const applyProjectSettingsToCode = useCallback((nextSettings: ProjectSettingsForm) => {
    const width = Number.parseInt(nextSettings.width, 10);
    const height = Number.parseInt(nextSettings.height, 10);

    if (!Number.isInteger(width) || !Number.isInteger(height)) {
      setProjectSettingsError('Canvas width and height must be whole numbers.');
      return;
    }

    if (width < MIN_CANVAS_SIZE || height < MIN_CANVAS_SIZE) {
      setProjectSettingsError(`Canvas must be at least ${MIN_CANVAS_SIZE}px on each side.`);
      return;
    }

    if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
      setProjectSettingsError(`Canvas can be at most ${MAX_CANVAS_SIZE}px on each side.`);
      return;
    }

    if (width * height > MAX_CANVAS_PIXELS) {
      setProjectSettingsError('Canvas is too large for the current render budget. Keep it at or below 4K pixel area.');
      return;
    }

    const nextCode = upsertOutputStatement(code, {
      outputFilename: nextSettings.outputFilename,
      width,
      height,
    });

    const validation = applyDraftCode(nextCode);
    if (validation.errors.length === 0) {
      syncPreview(nextCode);
    }
    setProjectSettingsError(null);
    setProjectSettingsNotice(`Updated output to ${sanitizeDownloadFilename(nextSettings.outputFilename)} at ${width}x${height}.`);
  }, [applyDraftCode, code, syncPreview]);

  const handleProjectSettingsSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextSettings = readProjectSettingsFromForm(event.currentTarget);
    setProjectSettings(nextSettings);
    applyProjectSettingsToCode(nextSettings);
  }, [applyProjectSettingsToCode]);

  const handleProjectSettingsChange = useCallback(
    (field: keyof ProjectSettingsForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setProjectSettings((current) => ({ ...current, [field]: event.target.value }));
      setProjectSettingsError(null);
      setProjectSettingsNotice(null);
    },
    [],
  );

  const handleCanvasPresetSelect = useCallback((resolutionKey: string) => {
    const resolution = RENDER_RESOLUTIONS[resolutionKey];
    if (!resolution) {
      return;
    }

    const currentSettings = projectSettingsFormRef.current
      ? readProjectSettingsFromForm(projectSettingsFormRef.current)
      : projectSettings;
    const nextSettings = {
      ...currentSettings,
      width: String(resolution.width),
      height: String(resolution.height),
    };

    setProjectSettings(nextSettings);
    applyProjectSettingsToCode(nextSettings);
  }, [applyProjectSettingsToCode, projectSettings]);

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
      syncPreview(code);
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
            const headerFilename = downloadResponse.headers
              .get('content-disposition')
              ?.match(/filename="([^"]+)"/)?.[1];
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
  }, [clearRenderPoll, code, draftRenderConfig.outputFilename, draftRenderConfig.resolutionKey, previewNeedsRefresh, syncPreview]);

  const focusTemplateSaveForm = useCallback(() => {
    setSidebarTab('editor');
    window.requestAnimationFrame(() => {
      templateTitleInputRef.current?.focus();
      templateTitleInputRef.current?.select();
    });
  }, []);

  const handleTemplateSaveFieldChange = useCallback(
    (field: keyof TemplateSaveForm) =>
      (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      ) => {
        setTemplateSaveForm((current) => ({ ...current, [field]: event.target.value }));
        setTemplateSaveNotice(null);
      },
    []
  );

  const handleSaveTemplate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const validation = validateVidscript(code);
      if (validation.errors.length > 0) {
        setErrors(validation.errors);
        setTemplateSaveNotice({
          tone: 'error',
          title: 'Unable to save template',
          description: 'Fix VidScript validation issues before saving this template.',
        });
        return;
      }

      if (!templateSaveForm.title.trim()) {
        setTemplateSaveNotice({
          tone: 'error',
          title: 'Template title required',
          description: 'Add a clear title so you can find this template again later.',
        });
        templateTitleInputRef.current?.focus();
        return;
      }

      const extractedPlaceholders = extractPlaceholders(code);

      setSavingTemplate(true);
      setTemplateSaveNotice(null);

      try {
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: templateSaveForm.title.trim(),
            description: trimOptionalText(templateSaveForm.description),
            category: trimOptionalText(templateSaveForm.category),
            tags: parseTemplateTags(templateSaveForm.tags),
            status: templateSaveForm.status,
            vidscript: code,
            placeholders: buildTemplatePlaceholders(extractedPlaceholders),
          }),
        });

        if (!response.ok) {
          throw new Error(await readApiError(response, 'Failed to save template.'));
        }

        const data = (await response.json()) as {
          template?: { title?: string; status?: TemplateStatusValue };
        };
        const savedTitle = data.template?.title?.trim() || templateSaveForm.title.trim();
        const savedStatus = data.template?.status || templateSaveForm.status;

        setTemplateSaveNotice({
          tone: 'success',
          title: 'Template saved',
          description:
            savedStatus === 'public'
              ? `${savedTitle} was saved and explicitly published as a public template.`
              : `${savedTitle} was saved with ${extractedPlaceholders.length} placeholder${extractedPlaceholders.length === 1 ? '' : 's'} as a ${savedStatus} template.`,
        });
      } catch (error) {
        setTemplateSaveNotice({
          tone: 'error',
          title: 'Template save failed',
          description: error instanceof Error ? error.message : 'Please try saving the template again.',
        });
      } finally {
        setSavingTemplate(false);
      }
    },
    [code, templateSaveForm]
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#090f1a', color: '#dbe7ff' }}>
      <aside
        style={{
          width: '360px',
          borderRight: '1px solid #1f2c46',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(180deg, #0d1628 0%, #0b1220 100%)',
        }}
      >
        <div
          style={{
            padding: '0.9rem 1rem',
            borderBottom: '1px solid #1f2c46',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.7rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#e4edff',
                textDecoration: 'none',
                fontWeight: 700,
              }}
            >
              <ArrowLeft size={16} />
                ReelForge
              </Link>
            <Link
              href="/account"
              title="Manage your account, integrations, and API settings."
              style={{
                fontSize: '0.75rem',
                color: '#cfe0ff',
                border: '1px solid #30476f',
                borderRadius: 999,
                padding: '0.35rem 0.7rem',
                background: '#10192d',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Account settings
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
            <Button
              onClick={handlePreview}
              variant="secondary"
              size="sm"
              title={previewActionTitle}
              className="justify-center gap-2"
              style={{
                height: 38,
                background: previewNeedsRefresh ? '#1a2d4d' : '#12253f',
                color: '#dbe7ff',
                border: '1px solid #2f4a73',
              }}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Button>

            <Button
              onClick={focusTemplateSaveForm}
              variant="secondary"
              size="sm"
              title={saveTemplateActionTitle}
              className="justify-center gap-2"
              disabled={savingTemplate}
              style={{
                height: 38,
                background: '#12253f',
                color: '#dbe7ff',
                border: '1px solid #2f4a73',
              }}
            >
              <Clapperboard className="h-4 w-4" />
              {savingTemplate ? 'Saving…' : 'Save template'}
            </Button>

            <Button
              onClick={handleExport}
              size="sm"
              title={exportActionTitle}
              className="justify-center gap-2"
              disabled={rendering || errors.length > 0}
              style={{
                height: 38,
                background: 'linear-gradient(135deg, #2457ff, #3f8cff)',
                color: 'white',
              }}
            >
              <Download className="h-4 w-4" />
              {rendering ? `Export ${renderProgress}%` : 'Export'}
            </Button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.74rem', color: errors.length ? '#fecaca' : previewNeedsRefresh ? '#fcd34d' : '#86efac' }}>
              {compactStatusText}
            </span>
            <Link
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '0.74rem', color: '#8fb1ff', textDecoration: 'none', whiteSpace: 'nowrap' }}
              title="Open the render preview in a separate tab."
            >
              Open preview
            </Link>
          </div>

          <div
            style={{
              fontSize: '0.74rem',
              color: '#8aa4d4',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={outputSummaryText}
          >
            {outputSummaryText}
          </div>

          {rendering && (
            <div>
              <div style={{ height: 6, borderRadius: 999, background: '#1b2a45', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${renderProgress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex min-h-0 flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 mx-4 mt-3" style={{ background: '#101d33', border: '1px solid #243656' }}>
            <TabsTrigger value="editor">
              <Code2 className="h-3 w-3 mr-1" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="assets">
              <FolderOpen className="h-3 w-3 mr-1" />
              Assets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 overflow-auto m-0 px-4 pb-4 pt-3 space-y-4">
            <div style={{ border: '1px solid #2a3d5f', borderRadius: 18, padding: '0.95rem', background: 'linear-gradient(180deg, rgba(15,26,46,0.98) 0%, rgba(10,18,31,0.96) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#e7efff' }}>Project settings</h3>
                <span style={{ fontSize: '0.74rem', color: '#8aa4d4' }}>{draftRenderConfig.resolutionKey}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#89a3d3', marginBottom: '0.8rem' }}>
                Output filename and canvas write back to the script.
              </div>

              <form ref={projectSettingsFormRef} onSubmit={handleProjectSettingsSubmit} style={{ display: 'grid', gap: '0.9rem' }}>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label htmlFor="output-filename" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                    Output filename
                  </label>
                  <Input
                    id="output-filename"
                    name="outputFilename"
                    value={projectSettings.outputFilename}
                    onChange={handleProjectSettingsChange('outputFilename')}
                    placeholder="campaign-cut.mp4"
                    className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <div style={{ display: 'grid', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>Canvas presets</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '0.5rem' }}>
                    {CANVAS_PRESETS.map((preset) => {
                      const active = selectedCanvasPreset === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => handleCanvasPresetSelect(preset.key)}
                          style={{
                            display: 'grid',
                            gap: '0.2rem',
                            borderRadius: 14,
                            border: active ? '1px solid #5b8cff' : '1px solid #2a3d5f',
                            background: active ? 'rgba(36, 87, 255, 0.18)' : '#0d1728',
                            padding: '0.6rem 0.55rem',
                            textAlign: 'left',
                            color: active ? '#eff5ff' : '#c7d6ef',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{preset.label}</span>
                          <span style={{ fontSize: '0.68rem', color: active ? '#bfd8ff' : '#8aa4d4' }}>{preset.ratio}</span>
                          <span style={{ fontSize: '0.68rem', color: active ? '#bfd8ff' : '#8aa4d4' }}>{preset.key}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <label htmlFor="canvas-width" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                      Canvas width
                    </label>
                    <Input
                      id="canvas-width"
                      name="canvasWidth"
                      type="number"
                      min={MIN_CANVAS_SIZE}
                      max={MAX_CANVAS_SIZE}
                      value={projectSettings.width}
                      onChange={handleProjectSettingsChange('width')}
                      className="border-slate-700 bg-slate-950/60 text-slate-100"
                    />
                  </div>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <label htmlFor="canvas-height" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                      Canvas height
                    </label>
                    <Input
                      id="canvas-height"
                      name="canvasHeight"
                      type="number"
                      min={MIN_CANVAS_SIZE}
                      max={MAX_CANVAS_SIZE}
                      value={projectSettings.height}
                      onChange={handleProjectSettingsChange('height')}
                      className="border-slate-700 bg-slate-950/60 text-slate-100"
                    />
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#8aa4d4', lineHeight: 1.5 }}>
                  Presets apply immediately. Use `Apply to script` after entering custom dimensions.
                </div>

                {projectSettingsError && (
                  <div style={{ fontSize: '0.76rem', color: '#fecaca', border: '1px solid #7f1d1d', background: '#231018', borderRadius: 12, padding: '0.65rem 0.75rem' }}>
                    {projectSettingsError}
                  </div>
                )}
                {!projectSettingsError && projectSettingsNotice && (
                  <div style={{ fontSize: '0.76rem', color: '#c7f9cc', border: '1px solid #1f5135', background: '#0f2018', borderRadius: 12, padding: '0.65rem 0.75rem' }}>
                    {projectSettingsNotice}
                  </div>
                )}

                <Button type="submit" size="sm" className="w-full" style={{ background: '#1f4ed8', color: '#f8fbff' }}>
                  Apply to script
                </Button>
              </form>
            </div>

            <div style={{ border: '1px solid #2a3d5f', borderRadius: 18, padding: '0.95rem', background: 'linear-gradient(180deg, rgba(14,24,43,0.98) 0%, rgba(8,14,25,0.98) 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.3rem' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#e7efff' }}>Save as template</h3>
                <span style={{ fontSize: '0.74rem', color: '#8aa4d4' }}>
                  {placeholders.length} placeholder{placeholders.length === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#89a3d3', marginBottom: '0.8rem', lineHeight: 1.5 }}>
                Capture reusable metadata for the current VidScript without changing the parser or preview flow.
              </div>

              <form onSubmit={handleSaveTemplate} style={{ display: 'grid', gap: '0.9rem' }}>
                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label htmlFor="template-title" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                    Title
                  </label>
                  <Input
                    ref={templateTitleInputRef}
                    id="template-title"
                    value={templateSaveForm.title}
                    onChange={handleTemplateSaveFieldChange('title')}
                    placeholder={buildSuggestedTemplateTitle(projectSettingsFromCode.outputFilename)}
                    className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label htmlFor="template-description" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                    Description
                  </label>
                  <textarea
                    id="template-description"
                    value={templateSaveForm.description}
                    onChange={handleTemplateSaveFieldChange('description')}
                    placeholder="What is this template for, and when should someone use it?"
                    rows={3}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      border: '1px solid #334155',
                      background: 'rgba(2, 6, 23, 0.6)',
                      color: '#e2e8f0',
                      padding: '0.7rem 0.8rem',
                      fontSize: '0.85rem',
                      resize: 'vertical',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <label htmlFor="template-category" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                      Category
                    </label>
                    <Input
                      id="template-category"
                      value={templateSaveForm.category}
                      onChange={handleTemplateSaveFieldChange('category')}
                      placeholder="Marketing"
                      className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
                    />
                  </div>

                  <div style={{ display: 'grid', gap: '0.35rem' }}>
                    <label htmlFor="template-status" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                      Status
                    </label>
                    <select
                      id="template-status"
                      value={templateSaveForm.status}
                      onChange={handleTemplateSaveFieldChange('status')}
                      style={{
                        height: 36,
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid #334155',
                        background: 'rgba(2, 6, 23, 0.75)',
                        color: '#e2e8f0',
                        padding: '0 0.8rem',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      {TEMPLATE_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: '0.35rem' }}>
                  <label htmlFor="template-tags" style={{ fontSize: '0.76rem', color: '#8aa4d4' }}>
                    Tags
                  </label>
                  <Input
                    id="template-tags"
                    value={templateSaveForm.tags}
                    onChange={handleTemplateSaveFieldChange('tags')}
                    placeholder="ugc, promo, social"
                    className="border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500"
                  />
                  <div style={{ fontSize: '0.72rem', color: '#7088b6' }}>
                    Separate tags with commas. Up to 25 unique tags are sent to the API.
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#8aa4d4', lineHeight: 1.55, border: '1px solid #243656', background: '#0d1728', borderRadius: 12, padding: '0.7rem 0.8rem' }}>
                  <div style={{ color: '#dbe7ff', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Placeholder metadata
                  </div>
                  <div style={{ marginBottom: placeholders.length > 0 ? '0.55rem' : 0 }}>
                    Placeholder names extracted from the current script are sent with this template as reusable field metadata.
                  </div>
                  {placeholders.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {placeholders.map((placeholder) => (
                        <span
                          key={placeholder}
                          style={{
                            borderRadius: 999,
                            border: '1px solid #31528a',
                            background: 'rgba(36, 87, 255, 0.12)',
                            color: '#cfe0ff',
                            padding: '0.18rem 0.55rem',
                            fontSize: '0.72rem',
                          }}
                        >
                          {`{{${placeholder}}}`}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#9db5df' }}>
                      No placeholders detected in the current script yet. The template will save without placeholder fields.
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#7088b6', lineHeight: 1.5 }}>
                  {TEMPLATE_STATUS_OPTIONS.find((option) => option.value === templateSaveForm.status)?.description}
                </div>

                {templateSaveNotice && (
                  <div
                    style={{
                      fontSize: '0.76rem',
                      color: templateSaveNotice.tone === 'success' ? '#c7f9cc' : '#fecaca',
                      border: templateSaveNotice.tone === 'success' ? '1px solid #1f5135' : '1px solid #7f1d1d',
                      background: templateSaveNotice.tone === 'success' ? '#0f2018' : '#231018',
                      borderRadius: 12,
                      padding: '0.7rem 0.8rem',
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{templateSaveNotice.title}</div>
                    <div>{templateSaveNotice.description}</div>
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  className="w-full"
                  disabled={savingTemplate}
                  style={{ background: 'linear-gradient(135deg, #2457ff, #3f8cff)', color: '#f8fbff' }}
                >
                  {savingTemplate ? 'Saving template…' : 'Save as template'}
                </Button>
              </form>
            </div>

            {placeholders.length > 0 && (
              <div style={{ border: '1px solid #2a3d5f', borderRadius: 16, padding: '0.9rem', background: '#0f1a2e' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: '#b8ccf0' }}>Placeholders</h3>
                {placeholders.map((placeholder) => (
                  <div key={placeholder} style={{ fontSize: '0.82rem', padding: '0.25rem 0', color: '#9db5df' }}>
                    {`{{${placeholder}}}`}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assets" className="m-0 flex-1 min-h-0 overflow-hidden px-3 pb-3 pt-2">
            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(10,16,29,0.96),rgba(7,11,20,0.98))] shadow-[inset_0_1px_0_rgba(148,163,184,0.06)]">
              <AssetLibrary onInsertAsset={handleInsertAsset} />
            </div>
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
          setProjectSettingsError(null);
          setProjectSettingsNotice(null);
          applyDraftCode(newCode);
        }}
        apiKey={process.env.NEXT_PUBLIC_OPENAI_API_KEY}
      />
    </div>
  );
}
