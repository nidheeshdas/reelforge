'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LayoutTemplate, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getMonetizedSurfaceNotice, getTemplateMediaDisclaimer } from '@/lib/support-matrix/capabilities';
import { extractPlaceholders, fillPlaceholders } from '@/parser';
import { cn } from '@/lib/utils';

type TemplateCategoryVisual = {
  badgeClassName: string;
  gradientClassName: string;
  symbol: string;
};

type TemplateResponse = {
  template: {
    id: number;
    creatorId: number;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    vidscript: string;
    placeholders: unknown;
    defaultValues: unknown;
    category: string | null;
    tags: string[];
    priceCents: number;
    downloads: number;
    ratingAvg: number;
    status: string;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    creator: {
      id: number;
      name: string | null;
      image: string | null;
    };
  };
};

type PlaceholderType = 'text' | 'number' | 'select' | 'textarea' | 'video' | 'audio';

type PlaceholderField = {
  name: string;
  label: string;
  type: PlaceholderType;
  required: boolean;
  defaultValue?: string | number;
  options: string[];
  helpText?: string;
  group?: string;
  accept?: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  maxLength?: number;
};

type TemplateDetail = TemplateResponse['template'] & {
  placeholders: PlaceholderField[];
};

const TEMPLATE_VISUALS: Record<string, TemplateCategoryVisual> = {
  celebration: {
    badgeClassName: 'border-pink-400/25 bg-pink-500/10 text-pink-200',
    gradientClassName:
      'bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.3),_transparent_55%),linear-gradient(135deg,rgba(129,140,248,0.9),rgba(126,34,206,0.95))]',
    symbol: '💒',
  },
  ads: {
    badgeClassName: 'border-amber-400/25 bg-amber-500/10 text-amber-200',
    gradientClassName:
      'bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.24),_transparent_55%),linear-gradient(135deg,rgba(249,115,22,0.88),rgba(180,83,9,0.96))]',
    symbol: '📣',
  },
  business: {
    badgeClassName: 'border-violet-400/25 bg-violet-500/10 text-violet-200',
    gradientClassName:
      'bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.24),_transparent_55%),linear-gradient(135deg,rgba(99,102,241,0.88),rgba(79,70,229,0.96))]',
    symbol: '💼',
  },
  travel: {
    badgeClassName: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200',
    gradientClassName:
      'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.3),_transparent_55%),linear-gradient(135deg,rgba(14,165,233,0.88),rgba(37,99,235,0.95))]',
    symbol: '✈️',
  },
  fitness: {
    badgeClassName: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
    gradientClassName:
      'bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.25),_transparent_55%),linear-gradient(135deg,rgba(34,197,94,0.88),rgba(22,101,52,0.96))]',
    symbol: '💪',
  },
  testimonials: {
    badgeClassName: 'border-sky-400/25 bg-sky-500/10 text-sky-200',
    gradientClassName:
      'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_55%),linear-gradient(135deg,rgba(2,132,199,0.88),rgba(30,64,175,0.95))]',
    symbol: '🗣️',
  },
};

const defaultVisual: TemplateCategoryVisual = {
  badgeClassName: 'border-slate-700 bg-slate-900/80 text-slate-300',
  gradientClassName:
    'bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.16),_transparent_55%),linear-gradient(135deg,rgba(30,41,59,0.96),rgba(15,23,42,0.96))]',
  symbol: '🎬',
};

const fieldClassName =
  'border-slate-700 bg-slate-950/70 text-slate-100 shadow-none placeholder:text-slate-500 focus-visible:ring-indigo-400';

const selectClassName =
  'flex h-9 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-1 text-sm text-slate-100 shadow-none transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 disabled:cursor-not-allowed disabled:opacity-50';
const supportNotice = getMonetizedSurfaceNotice();
const templateMediaDisclaimer = getTemplateMediaDisclaimer();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPrimitiveDefault(value: unknown): string | number | undefined {
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return undefined;
}

function humanizePlaceholderName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizePlaceholderType(type: unknown, fallback?: string | number): PlaceholderType {
  if (type === 'number') {
    return 'number';
  }

  if (type === 'select') {
    return 'select';
  }

  if (type === 'textarea') {
    return 'textarea';
  }

  if (type === 'video') {
    return 'video';
  }

  if (type === 'audio') {
    return 'audio';
  }

  if (typeof fallback === 'number') {
    return 'number';
  }

  return 'text';
}

function parseInlineDefaults(vidscript: string): Record<string, string> {
  const regex = /\{\{(\w+)(?:\s*\|\s*([^}]+))?\}\}/g;
  const defaults: Record<string, string> = {};
  let match: RegExpExecArray | null;

  while ((match = regex.exec(vidscript)) !== null) {
    const [, key, rawDefault] = match;
    if (!rawDefault || defaults[key] !== undefined) {
      continue;
    }

    defaults[key] = rawDefault.trim();
  }

  return defaults;
}

function readDefaultValue(
  placeholderName: string,
  placeholderValue: unknown,
  defaultValues: unknown,
  inlineDefaults: Record<string, string>,
): string | number | undefined {
  if (isRecord(defaultValues)) {
    const fromDefaultValues = toPrimitiveDefault(defaultValues[placeholderName]);
    if (fromDefaultValues !== undefined) {
      return fromDefaultValues;
    }
  }

  const fromPlaceholder = toPrimitiveDefault(placeholderValue);
  if (fromPlaceholder !== undefined) {
    return fromPlaceholder;
  }

  const inlineDefault = inlineDefaults[placeholderName];
  if (inlineDefault === undefined) {
    return undefined;
  }

  const inlineAsNumber = Number(inlineDefault);
  return Number.isNaN(inlineAsNumber) ? inlineDefault : inlineAsNumber;
}

function dedupePlaceholders(placeholders: PlaceholderField[]): PlaceholderField[] {
  const seen = new Set<string>();

  return placeholders.filter((placeholder) => {
    if (seen.has(placeholder.name)) {
      return false;
    }

    seen.add(placeholder.name);
    return true;
  });
}

function normalizePlaceholders(rawPlaceholders: unknown, defaultValues: unknown, vidscript: string): PlaceholderField[] {
  const inlineDefaults = parseInlineDefaults(vidscript);

  if (Array.isArray(rawPlaceholders) && rawPlaceholders.length > 0) {
    const normalized = rawPlaceholders.flatMap((placeholder): PlaceholderField[] => {
      if (typeof placeholder === 'string' && placeholder.trim()) {
        const name = placeholder.trim();
        const defaultValue = readDefaultValue(name, undefined, defaultValues, inlineDefaults);

        return [
          {
            name,
            label: humanizePlaceholderName(name),
            type: normalizePlaceholderType(undefined, defaultValue),
            required: false,
            defaultValue,
            options: [],
          },
        ];
      }

      if (!isRecord(placeholder) || typeof placeholder.name !== 'string' || !placeholder.name.trim()) {
        return [];
      }

      const name = placeholder.name.trim();
      const defaultValue = readDefaultValue(name, placeholder.default, defaultValues, inlineDefaults);
      const options = Array.isArray(placeholder.options)
        ? placeholder.options.filter((option): option is string => typeof option === 'string' && option.trim().length > 0)
        : [];
      const normalizedType = options.length > 0 ? normalizePlaceholderType(placeholder.type ?? 'select', defaultValue) : normalizePlaceholderType(placeholder.type, defaultValue);
      const acceptValue = Array.isArray(placeholder.accept)
        ? placeholder.accept.filter((accept): accept is string => typeof accept === 'string' && accept.trim().length > 0).join(',')
        : typeof placeholder.accept === 'string'
          ? placeholder.accept
          : undefined;

      return [
        {
          name,
          label:
            typeof placeholder.label === 'string' && placeholder.label.trim().length > 0
              ? placeholder.label
              : humanizePlaceholderName(name),
          type: normalizedType,
          required: placeholder.required === true,
          defaultValue,
          options,
          helpText: typeof placeholder.helpText === 'string' ? placeholder.helpText : undefined,
          group: typeof placeholder.group === 'string' ? placeholder.group : undefined,
          accept: acceptValue,
          min: typeof placeholder.min === 'number' ? placeholder.min : undefined,
          max: typeof placeholder.max === 'number' ? placeholder.max : undefined,
          step: typeof placeholder.step === 'number' ? placeholder.step : undefined,
          unit: typeof placeholder.unit === 'string' ? placeholder.unit : undefined,
          maxLength: typeof placeholder.maxLength === 'number' ? placeholder.maxLength : undefined,
        },
      ];
    });

    return dedupePlaceholders(normalized);
  }

  return extractPlaceholders(vidscript).map((name) => ({
    name,
    label: humanizePlaceholderName(name),
    type: normalizePlaceholderType(undefined, readDefaultValue(name, undefined, defaultValues, inlineDefaults)),
    required: false,
    defaultValue: readDefaultValue(name, undefined, defaultValues, inlineDefaults),
    options: [],
  }));
}

function normalizeTemplate(template: TemplateResponse['template']): TemplateDetail {
  return {
    ...template,
    placeholders: normalizePlaceholders(template.placeholders, template.defaultValues, template.vidscript),
  };
}

function buildInitialValues(placeholders: PlaceholderField[]): Record<string, string | number> {
  return placeholders.reduce<Record<string, string | number>>((acc, placeholder) => {
    if (placeholder.defaultValue !== undefined) {
      acc[placeholder.name] = placeholder.defaultValue;
    }

    return acc;
  }, {});
}

function TemplateUnavailableState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)]">
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 py-12">
        <Card className="w-full border-slate-800 bg-slate-950/70 text-slate-100 shadow-none">
          <CardHeader className="space-y-3">
            <Badge variant="outline" className="w-fit border-slate-700 bg-slate-900/80 text-slate-300">
              Template library
            </Badge>
            <CardTitle className="text-2xl text-slate-50">{title}</CardTitle>
            <p className="text-sm leading-6 text-slate-400">{description}</p>
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

function LoadingState() {
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
              <div className="text-xs text-slate-500">Loading template details…</div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Card className="border-slate-800 bg-slate-950/55 text-slate-100 shadow-none">
          <CardContent className="flex items-center gap-3 p-8 text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-300" />
            Fetching the latest template configuration from the library.
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function TemplateDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTemplate() {
      setLoading(true);
      setNotFound(false);
      setRequestFailed(false);

      try {
        const response = await fetch(`/api/templates/${params.id}`, {
          cache: 'no-store',
          credentials: 'same-origin',
        });

        if (cancelled) {
          return;
        }

        if (response.status === 404) {
          setTemplate(null);
          setValues({});
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const data = (await response.json()) as TemplateResponse;
        const normalizedTemplate = normalizeTemplate(data.template);

        setTemplate(normalizedTemplate);
        setValues(buildInitialValues(normalizedTemplate.placeholders));
      } catch (error) {
        console.error('Failed to load template detail:', error);
        if (!cancelled) {
          setTemplate(null);
          setValues({});
          setRequestFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const handleValueChange = (name: string, value: string | number) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseTemplate = () => {
    if (!template) {
      return;
    }

    const code = fillPlaceholders(template.vidscript, values);
    localStorage.setItem('vidscript_import', code);
    router.push('/editor');
  };

  const visual = useMemo(() => {
    if (!template?.category) {
      return defaultVisual;
    }

    return TEMPLATE_VISUALS[template.category.toLowerCase()] ?? defaultVisual;
  }, [template?.category]);

  const groupedPlaceholders = useMemo(() => {
    if (!template) {
      return [] as Array<{ title: string; placeholders: PlaceholderField[] }>;
    }

    const groups = new Map<string, PlaceholderField[]>();

    template.placeholders.forEach((placeholder) => {
      const title = placeholder.group?.trim() || 'Template fields';
      groups.set(title, [...(groups.get(title) ?? []), placeholder]);
    });

    return Array.from(groups.entries()).map(([title, placeholders]) => ({ title, placeholders }));
  }, [template]);

  if (loading) {
    return <LoadingState />;
  }

  if (notFound) {
    return (
      <TemplateUnavailableState
        title="Template not found"
        description="This template is unavailable right now. Free public templates remain accessible here, but hidden or missing templates stay out of reach. Head back to the library and choose another starting point."
      />
    );
  }

  if (requestFailed || !template) {
    return (
      <TemplateUnavailableState
        title="Template unavailable"
        description="We couldn't load this template right now. Please try again in a moment, or head back to the library and choose another starting point."
      />
    );
  }

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
            <div className={cn('rounded-3xl border border-slate-800 p-8', visual.gradientClassName)}>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white/90">
                <Sparkles className="h-3.5 w-3.5" />
                Template preview
              </div>
              <div className="mt-10 flex h-48 items-center justify-center text-7xl">{visual.symbol}</div>
            </div>

            <Card className="border-slate-800 bg-slate-950/55 text-slate-100 shadow-none">
              <CardHeader className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className={cn('capitalize', visual.badgeClassName)}>
                    {template.category ?? 'Template'}
                  </Badge>
                  <Badge variant="outline" className="border-slate-700 bg-slate-900/80 text-slate-300">
                    {template.placeholders.length} placeholder{template.placeholders.length === 1 ? '' : 's'}
                  </Badge>
                  {template.downloads > 0 && (
                    <Badge variant="outline" className="border-slate-700 bg-slate-900/80 text-slate-300">
                      {template.downloads} download{template.downloads === 1 ? '' : 's'}
                    </Badge>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-50">{template.title}</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{template.description || 'A reusable VidScript starting point ready for quick customization.'}</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Price</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-50">
                      {template.priceCents === 0 ? 'Free public template' : `$${(template.priceCents / 100).toFixed(2)} draft`}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {template.priceCents === 0
                        ? 'Free public templates can be opened immediately.'
                        : 'Template checkout and entitlements are out of scope in the current product slice.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Creator</div>
                    <div className="mt-2 text-lg font-semibold text-slate-50">{template.creator.name || 'ReelForge'}</div>
                    <p className="mt-2 text-xs text-slate-500">Published templates stay publicly accessible. Hidden templates remain protected.</p>
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

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="text-sm font-semibold text-amber-100">{supportNotice.title}</div>
                  <p className="mt-2 text-xs leading-6 text-amber-100/80">{templateMediaDisclaimer}</p>
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
                  Update the available fields, then send the generated script into the editor. Metadata-backed placeholders get their intended controls, while simpler placeholder-only templates gracefully fall back to clean text inputs.
                </p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {groupedPlaceholders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm leading-6 text-slate-400">
                  This template doesn&apos;t define placeholder metadata yet. You can still open it in the editor and continue refining the script there.
                </div>
              ) : (
                groupedPlaceholders.map((group) => (
                  <div key={group.title} className="space-y-4">
                    {groupedPlaceholders.length > 1 && (
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{group.title}</div>
                    )}

                    {group.placeholders.map((placeholder) => {
                      const value = values[placeholder.name];

                      return (
                        <div key={placeholder.name} className="space-y-2">
                          <label className="block text-sm font-medium text-slate-200" htmlFor={`placeholder-${placeholder.name}`}>
                            {placeholder.label}
                            {!placeholder.required && <span className="text-slate-500"> (optional)</span>}
                          </label>

                          {placeholder.type === 'textarea' && (
                            <textarea
                              id={`placeholder-${placeholder.name}`}
                              className={cn(
                                fieldClassName,
                                'min-h-28 rounded-md px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1',
                              )}
                              value={typeof value === 'number' ? String(value) : (value ?? '')}
                              maxLength={placeholder.maxLength}
                              onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                            />
                          )}

                          {placeholder.type === 'number' && (
                            <div className="relative">
                              <Input
                                id={`placeholder-${placeholder.name}`}
                                type="number"
                                className={cn(fieldClassName, placeholder.unit ? 'pr-16' : undefined)}
                                value={value ?? ''}
                                min={placeholder.min}
                                max={placeholder.max}
                                step={placeholder.step}
                                onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                              />
                              {placeholder.unit && (
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs uppercase tracking-[0.14em] text-slate-500">
                                  {placeholder.unit}
                                </span>
                              )}
                            </div>
                          )}

                          {placeholder.type === 'select' && placeholder.options.length > 0 && (
                            <select
                              id={`placeholder-${placeholder.name}`}
                              className={cn(selectClassName)}
                              value={typeof value === 'number' ? String(value) : (value ?? '')}
                              onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                            >
                              <option value="" className="bg-slate-950 text-slate-400">
                                Select an option
                              </option>
                              {placeholder.options.map((option) => (
                                <option key={option} value={option} className="bg-slate-950 text-slate-100">
                                  {option}
                                </option>
                              ))}
                            </select>
                          )}

                          {(placeholder.type === 'text' ||
                            (placeholder.type === 'select' && placeholder.options.length === 0) ||
                            placeholder.type === 'video' ||
                            placeholder.type === 'audio') && (
                            <Input
                              id={`placeholder-${placeholder.name}`}
                              type="text"
                              className={fieldClassName}
                              value={typeof value === 'number' ? String(value) : (value ?? '')}
                              maxLength={placeholder.maxLength}
                              placeholder={
                                placeholder.type === 'video'
                                  ? 'Paste a video URL or asset reference'
                                  : placeholder.type === 'audio'
                                    ? 'Paste an audio URL or asset reference'
                                    : `Enter ${placeholder.label.toLowerCase()}`
                              }
                              onChange={(event) => handleValueChange(placeholder.name, event.target.value)}
                            />
                          )}

                          <div className="space-y-1 text-xs text-slate-500">
                            {placeholder.helpText && <p>{placeholder.helpText}</p>}
                            {(placeholder.type === 'video' || placeholder.type === 'audio') && (
                              <p>
                                Media placeholders import as script references. You can fine-tune assets inside the editor after this handoff.
                                {placeholder.accept ? ` Accepted formats: ${placeholder.accept}.` : ''} {templateMediaDisclaimer}
                              </p>
                            )}
                            {placeholder.defaultValue !== undefined && (
                              <p>
                                Default: <span className="text-slate-300">{String(placeholder.defaultValue)}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}

              <button onClick={handleUseTemplate} className="btn btn-primary btn-lg w-full">
                Use Template
              </button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
