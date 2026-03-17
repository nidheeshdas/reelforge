'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Download, LayoutTemplate, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { getMonetizedSurfaceNotice } from '@/lib/support-matrix/capabilities';
import { cn } from '@/lib/utils';

interface TemplateLibraryItem {
  id: number;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  category: string | null;
  priceCents: number;
  downloads: number;
}

const TEMPLATE_VISUALS: Record<string, { badgeClassName: string; gradientClassName: string; symbol: string }> = {
  ads: {
    badgeClassName: 'border-amber-400/25 bg-amber-500/10 text-amber-100',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.28),_transparent_55%),linear-gradient(135deg,rgba(249,115,22,0.88),rgba(120,53,15,0.96))]',
    symbol: '📣',
  },
  testimonials: {
    badgeClassName: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.3),_transparent_55%),linear-gradient(135deg,rgba(14,165,233,0.88),rgba(30,64,175,0.96))]',
    symbol: '💬',
  },
  memes: {
    badgeClassName: 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.3),_transparent_55%),linear-gradient(135deg,rgba(236,72,153,0.88),rgba(126,34,206,0.96))]',
    symbol: '😂',
  },
  artistic: {
    badgeClassName: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.28),_transparent_55%),linear-gradient(135deg,rgba(45,212,191,0.88),rgba(20,83,45,0.96))]',
    symbol: '🎨',
  },
  celebration: {
    badgeClassName: 'border-pink-400/25 bg-pink-500/10 text-pink-200',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(244,114,182,0.3),_transparent_55%),linear-gradient(135deg,rgba(129,140,248,0.9),rgba(126,34,206,0.95))]',
    symbol: '💒',
  },
  travel: {
    badgeClassName: 'border-cyan-400/25 bg-cyan-500/10 text-cyan-200',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.3),_transparent_55%),linear-gradient(135deg,rgba(14,165,233,0.88),rgba(37,99,235,0.95))]',
    symbol: '✈️',
  },
  fitness: {
    badgeClassName: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
    gradientClassName: 'bg-[radial-gradient(circle_at_top,_rgba(74,222,128,0.25),_transparent_55%),linear-gradient(135deg,rgba(34,197,94,0.88),rgba(22,101,52,0.96))]',
    symbol: '💪',
  },
};

const DEFAULT_TEMPLATE_VISUAL = {
  badgeClassName: 'border-violet-400/25 bg-violet-500/10 text-violet-200',
  gradientClassName:
    'bg-[radial-gradient(circle_at_top,_rgba(167,139,250,0.3),_transparent_55%),linear-gradient(135deg,rgba(59,130,246,0.82),rgba(91,33,182,0.95))]',
  symbol: '✨',
};

const CANONICAL_TEMPLATE_CATEGORIES = ['ads', 'testimonials', 'memes', 'artistic'];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Newest first' },
  { value: 'popular', label: 'Most downloaded' },
] as const;
const supportNotice = getMonetizedSurfaceNotice();

function formatCategory(category: string | null) {
  if (!category) {
    return 'uncategorized';
  }

  return category.replace(/[-_]/g, ' ');
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(priceCents: number) {
  return priceCents === 0 ? 'Free' : `$${(priceCents / 100).toFixed(2)}`;
}

function TemplatesPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [templates, setTemplates] = useState<TemplateLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedCategory = searchParams.get('category')?.trim() ?? '';
  const selectedSort = searchParams.get('sort')?.trim() === 'popular' ? 'popular' : 'recent';

  useEffect(() => {
    const controller = new AbortController();

    async function loadTemplates() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({ scope: 'public' });

        if (selectedCategory) {
          params.set('category', selectedCategory);
        }

        if (selectedSort !== 'recent') {
          params.set('sort', selectedSort);
        }

        const response = await fetch(`/api/templates?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }

        const data = (await response.json()) as { templates?: TemplateLibraryItem[] };
        setTemplates(Array.isArray(data.templates) ? data.templates : []);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        console.error('Template library load error:', loadError);
        setError('Unable to load templates right now.');
        setTemplates([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadTemplates();

    return () => controller.abort();
  }, [selectedCategory, selectedSort]);

  const categoryOptions = useMemo(() => {
    const discoveredCategories = templates
      .map((template) => template.category?.trim())
      .filter((category): category is string => Boolean(category));

    return Array.from(new Set([...CANONICAL_TEMPLATE_CATEGORIES, ...discoveredCategories, selectedCategory].filter(Boolean)));
  }, [selectedCategory, templates]);

  const freeTemplates = useMemo(
    () => templates.filter((template) => template.priceCents === 0).length,
    [templates]
  );
  const isFiltered = Boolean(selectedCategory) || selectedSort !== 'recent';

  const templateSummary = isLoading
    ? 'Loading public starter templates...'
    : templates.length === 0
      ? isFiltered
        ? 'No templates match the current browse filters.'
        : 'No public templates are live yet.'
      : `${templates.length} launch-ready preset${templates.length === 1 ? '' : 's'}`;

  function updateFilters(nextValues: { category?: string; sort?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    const nextCategory = nextValues.category ?? selectedCategory;
    const nextSort = nextValues.sort ?? selectedSort;

    if (nextCategory) {
      params.set('category', nextCategory);
    } else {
      params.delete('category');
    }

    if (nextSort !== 'recent') {
      params.set('sort', nextSort);
    } else {
      params.delete('sort');
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)]">
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm font-medium text-slate-100 no-underline transition hover:border-slate-700 hover:bg-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              ReelForge
            </Link>
            <div>
              <div className="text-sm font-semibold text-slate-100">Template library</div>
              <div className="text-xs text-slate-500">Launch prebuilt VidScript starting points</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/editor" className="btn btn-primary">
              Create New
            </Link>
            <Link href="/assets" className="btn btn-ghost">
              Assets
            </Link>
            <Link href="/account" className="btn btn-outline">
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.8fr_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(18,27,47,0.98),rgba(10,15,26,0.95))] p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Ready-made templates
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-50">Templates</h1>
            <p className="mt-2 text-lg font-medium text-slate-200">Start with a reel structure that already fits the moment</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Browse curated VidScript templates, customize their placeholders, and jump straight into the editor with the generated script.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 text-slate-100">
                  <LayoutTemplate className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">{templateSummary}</div>
                  <div className="text-xs text-slate-500">Public starter templates are ready to personalize in the editor.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/20 p-2.5 text-amber-100">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-amber-100">
                    {isLoading ? 'Checking complimentary presets...' : `${freeTemplates} free public preset${freeTemplates === 1 ? '' : 's'}`}
                  </div>
                  <div className="text-xs text-amber-100/75">{supportNotice.description}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-100">Browse templates</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Narrow the seeded library by category or switch the sort order without leaving the page.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex min-w-[12rem] flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Category
                <select
                  value={selectedCategory}
                  onChange={(event) => updateFilters({ category: event.target.value })}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium capitalize text-slate-100 outline-none transition focus:border-slate-600"
                >
                  <option value="">All categories</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {titleCase(formatCategory(category))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex min-w-[12rem] flex-col gap-2 text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                Sort
                <select
                  value={selectedSort}
                  onChange={(event) => updateFilters({ sort: event.target.value })}
                  className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 outline-none transition focus:border-slate-600"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {isFiltered ? (
                <button
                  type="button"
                  onClick={() => updateFilters({ category: '', sort: 'recent' })}
                  className="inline-flex h-[50px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 px-4 text-sm font-medium text-slate-200 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card
                key={`template-skeleton-${index}`}
                className="flex h-full flex-col overflow-hidden border-slate-800 bg-slate-950/55 text-slate-100 shadow-none"
              >
                <div className="h-48 animate-pulse border-b border-slate-800 bg-slate-900/80" />
                <CardHeader className="space-y-4">
                  <div className="space-y-3">
                    <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-800" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-900" />
                    <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-900" />
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0">
                  <div className="h-10 w-24 animate-pulse rounded-2xl bg-slate-900" />
                  <div className="h-10 w-16 animate-pulse rounded-2xl bg-slate-900" />
                </CardContent>
                <CardFooter className="pt-0">
                  <div className="h-10 w-full animate-pulse rounded-full bg-slate-900" />
                </CardFooter>
              </Card>
            ))
          ) : error ? (
            <Card className="md:col-span-2 xl:col-span-3 border-slate-800 bg-slate-950/70 text-slate-100 shadow-none">
              <CardHeader className="space-y-3">
                <Badge variant="outline" className="w-fit border-slate-700 bg-slate-900/80 text-slate-300">
                  Template library
                </Badge>
                <CardTitle className="text-2xl text-slate-50">Library unavailable</CardTitle>
                <p className="text-sm leading-6 text-slate-400">
                  {error} Refresh the page in a moment to retry the public template feed.
                </p>
              </CardHeader>
            </Card>
          ) : templates.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3 border-slate-800 bg-slate-950/70 text-slate-100 shadow-none">
              <CardHeader className="space-y-3">
                <Badge variant="outline" className="w-fit border-slate-700 bg-slate-900/80 text-slate-300">
                  Template library
                </Badge>
                <CardTitle className="text-2xl text-slate-50">
                  {isFiltered ? 'No templates match these filters' : 'No public templates yet'}
                </CardTitle>
                <p className="text-sm leading-6 text-slate-400">
                  {isFiltered
                    ? 'Try a different category or sort order to explore the rest of the public starter library.'
                    : 'Public starter templates will appear here as soon as they are published. Check back soon or create your own reel flow in the editor.'}
                </p>
              </CardHeader>
              <CardFooter className="pt-0">
                <div className="flex flex-wrap gap-3">
                  {isFiltered ? (
                    <button
                      type="button"
                      onClick={() => updateFilters({ category: '', sort: 'recent' })}
                      className="btn btn-outline"
                    >
                      Reset filters
                    </button>
                  ) : null}
                  <Link href="/editor" className="btn btn-primary gap-2">
                    Create in Editor
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </CardFooter>
            </Card>
          ) : (
            templates.map((template) => {
              const visual = template.category ? TEMPLATE_VISUALS[template.category] ?? DEFAULT_TEMPLATE_VISUAL : DEFAULT_TEMPLATE_VISUAL;

              return (
                <Card
                  key={template.id}
                  className="flex h-full flex-col overflow-hidden border-slate-800 bg-slate-950/55 text-slate-100 shadow-none transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-950/70"
                >
                  <div className={cn('relative flex h-48 items-center justify-center overflow-hidden border-b border-slate-800 text-6xl', visual.gradientClassName)}>
                    {template.thumbnailUrl ? (
                      <>
                        <div
                          className="absolute inset-0 bg-cover bg-center opacity-45"
                          style={{ backgroundImage: `url(${template.thumbnailUrl})` }}
                        />
                        <div className="absolute inset-0 bg-slate-950/45" />
                      </>
                    ) : null}
                    <span aria-hidden="true" className="relative z-10">
                      {visual.symbol}
                    </span>
                  </div>

                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-xl text-slate-50">{template.title}</CardTitle>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          {template.description || 'A polished public template ready to customize in the editor.'}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn('capitalize', visual.badgeClassName)}>
                        {formatCategory(template.category)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="flex items-center justify-between pt-0">
                    <div>
                      <div className="text-lg font-semibold text-slate-50">{template.priceCents === 0 ? 'Free' : formatPrice(template.priceCents)}</div>
                      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        {template.priceCents === 0 ? 'Public access' : 'Private draft only'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 text-sm font-medium text-slate-200">
                        <Download className="h-3.5 w-3.5" />
                        {template.downloads.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-500">downloads</div>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-0">
                    <Link href={`/templates/${template.id}`} className="btn btn-primary w-full justify-center gap-2">
                      Use Template
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}

function TemplatesPageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#070c16_0%,#0a1221_100%)] text-slate-100">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-6 py-4 text-sm text-slate-300">
        Loading template library...
      </div>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<TemplatesPageFallback />}>
      <TemplatesPageContent />
    </Suspense>
  );
}
