'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutTemplate, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const TEMPLATES: Record<string, any> = {
  '1': {
    id: 1,
    title: 'Wedding Reel',
    description: 'Beautiful wedding highlights with romantic effects',
    price: 5,
    vidscript: `# Wedding Reel Template
input main_video = {{video1}}
input music = {{music | "default.mp3"}}

[0s - {{duration | 30}}s] = main_video.Trim(0, {{duration | 30}})
[0s - end] = filter {{effect | "sepia"}}, intensity: 0.4

[0s - end] = audio music, volume: {{volume | 0.6}}, fade_out: 3s

[1s - 4s] = text "{{title | The Wedding}}", style: title, position: center
[5s - end] = text "{{subtitle | Mr. & Mrs. Smith}}", style: subtitle, position: bottom-center

output to "wedding-reel.mp4", resolution: 1080x1920`,
    placeholders: [
      { name: 'video1', type: 'video', label: 'Main Video', required: true },
      { name: 'music', type: 'audio', label: 'Background Music', required: false },
      { name: 'duration', type: 'number', label: 'Duration (seconds)', default: 30 },
      { name: 'effect', type: 'select', label: 'Effect', options: ['none', 'sepia', 'monochrome', 'vintage'], default: 'sepia' },
      { name: 'volume', type: 'number', label: 'Music Volume', default: 0.6 },
      { name: 'title', type: 'text', label: 'Title Text', default: 'The Wedding' },
      { name: 'subtitle', type: 'text', label: 'Subtitle', default: 'Mr. & Mrs. Smith' },
    ],
  },
};

const fieldClassName =
  'border-slate-700 bg-slate-950/70 text-slate-100 shadow-none placeholder:text-slate-500 focus-visible:ring-indigo-400';

const selectClassName =
  'flex h-9 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-100 shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50';

export default function TemplateDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const template = TEMPLATES[params.id];
  const [values, setValues] = useState<Record<string, any>>({});

  if (!template) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)]">
        <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-12">
          <Card className="w-full border-slate-800 bg-slate-950/70 text-slate-100 shadow-none">
            <CardHeader className="space-y-3">
              <Badge variant="outline" className="w-fit border-slate-700 bg-slate-900/80 text-slate-300">
                Template library
              </Badge>
              <CardTitle className="text-2xl text-slate-50">Template not found</CardTitle>
              <p className="text-sm leading-6 text-slate-400">
                This template is unavailable right now. Head back to the library and choose another starting point.
              </p>
            </CardHeader>
            <CardContent>
              <Link href="/templates" className="btn btn-primary">
                Back to Templates
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const handleValueChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseTemplate = () => {
    let code = template.vidscript;
    Object.entries(values).forEach(([key, value]) => {
      code = code.replace(new RegExp(`\\{\\{${key}(?:\\s*\\|\\s*[^}]+)?\\}\\}`, 'g'), value || '');
    });
    router.push(`/editor?code=${encodeURIComponent(code)}`);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)]">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/templates"
              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-100 no-underline transition hover:border-slate-700 hover:bg-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              ← Back to Templates
            </Link>
            <div>
              <div className="text-sm font-semibold text-slate-100">Template setup</div>
              <div className="text-xs text-slate-500">Customize placeholders before opening the editor</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/assets" className="btn btn-ghost">
              Assets
            </Link>
            <Link href="/editor" className="btn btn-outline">
              Editor
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.3),_transparent_55%),linear-gradient(135deg,rgba(129,140,248,0.9),rgba(126,34,206,0.95))] p-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" />
                Template preview
              </div>
              <div className="mt-10 flex h-48 items-center justify-center text-7xl">💒</div>
            </div>

            <Card className="border-slate-800 bg-slate-950/55 text-slate-100 shadow-none">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-pink-400/25 bg-pink-500/10 text-pink-200">
                    Celebration
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 bg-slate-900/80 text-slate-300">
                    {template.placeholders.length} placeholders
                  </Badge>
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-50">{template.title}</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{template.description}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Price</div>
                  <div className="mt-2 text-3xl font-semibold text-slate-50">
                    {template.price === 0 ? 'Free' : `$${(template.price / 100).toFixed(2)}`}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <LayoutTemplate className="h-4 w-4 text-slate-400" />
                    VidScript template
                  </div>
                  <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-400">
                    {template.vidscript}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-800 bg-[rgba(7,11,20,0.92)] text-slate-100 shadow-[0_24px_80px_rgba(4,9,20,0.28)]">
            <CardHeader className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-200">
                <Sparkles className="h-3.5 w-3.5" />
                Fill Placeholders
              </div>
              <div>
                <CardTitle className="text-2xl text-slate-50">Make the template yours</CardTitle>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Update the available fields, then send the generated script into the editor.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {template.placeholders.map((placeholder: any) => (
                <div key={placeholder.name} className="space-y-2">
                  <label className="block text-sm font-medium text-slate-200">
                    {placeholder.label}
                    {!placeholder.required && <span className="text-slate-500"> (optional)</span>}
                  </label>

                  {placeholder.type === 'text' && (
                    <Input
                      type="text"
                      className={fieldClassName}
                      defaultValue={placeholder.default}
                      onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                    />
                  )}

                  {placeholder.type === 'number' && (
                    <Input
                      type="number"
                      className={fieldClassName}
                      defaultValue={placeholder.default}
                      onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                    />
                  )}

                  {placeholder.type === 'select' && (
                    <select
                      className={cn(selectClassName)}
                      defaultValue={placeholder.default}
                      onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                    >
                      {placeholder.options.map((option: string) => (
                        <option key={option} value={option} className="bg-slate-950 text-slate-100">
                          {option}
                        </option>
                      ))}
                    </select>
                  )}

                  {placeholder.type === 'video' && (
                    <div className="space-y-2">
                      <Input type="file" accept="video/*" className={fieldClassName} />
                      <p className="text-xs text-slate-500">Upload your video file.</p>
                    </div>
                  )}

                  {placeholder.type === 'audio' && (
                    <div className="space-y-2">
                      <Input type="file" accept="audio/*" className={fieldClassName} />
                      <p className="text-xs text-slate-500">Upload audio file.</p>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={handleUseTemplate} className="btn btn-primary btn-lg w-full">
                {template.price === 0 ? 'Use Template' : 'Purchase & Use'}
              </button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
