import Link from 'next/link';
import { ArrowLeft, ArrowRight, Download, LayoutTemplate, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const SAMPLE_TEMPLATES = [
  {
    id: 1,
    title: 'Wedding Reel',
    description: 'Beautiful wedding highlights with romantic effects',
    thumbnailUrl: '/templates/wedding.jpg',
    price: 5,
    category: 'celebration',
    downloads: 1234,
    vidscript: `# Wedding Reel Template
input main_video = {{video1}}
input music = {{music | "default.mp3"}}

[0s - {{duration | 30}}s] = main_video.Trim(0, {{duration | 30}})
[0s - end] = filter {{effect | "sepia"}}, intensity: 0.4

[0s - end] = audio music, volume: {{volume | 0.6}}, fade_out: 3s

[1s - 4s] = text "{{title | The Wedding}}", style: title, position: center
[5s - end] = text "{{subtitle | Mr. & Mrs. Smith}}", style: subtitle, position: bottom-center

output to "wedding-reel.mp4", resolution: 1080x1920`,
  },
  {
    id: 2,
    title: 'Travel Vlog',
    description: 'Dynamic travel footage with energetic transitions',
    thumbnailUrl: '/templates/travel.jpg',
    price: 0,
    category: 'travel',
    downloads: 5678,
    vidscript: `# Travel Vlog Template
input clips = {{video1}}
input music = {{music}}

[0s - {{duration | 30}}s] = clips

[0s - end] = filter "vignette", intensity: 0.3

[2s - 5s] = text "{{location | Bali}}", style: title, position: top-left
[5s - end] = text "{{hashtag | #TravelBali}}", style: caption, position: bottom-right

output to "travel-reel.mp4", resolution: 1080x1920`,
  },
  {
    id: 3,
    title: 'Fitness Promo',
    description: 'High-energy workout promotional video',
    thumbnailUrl: '/templates/fitness.jpg',
    price: 3,
    category: 'fitness',
    downloads: 890,
    vidscript: `# Fitness Promo Template
input workout = {{video1}}
input music = {{music}}

[0s - {{duration | 15}}s] = workout.Trim(0, {{duration | 15}})
[0s - end] = filter "contrast", amount: 1.3

[0s - end] = audio music, volume: 0.8

[0s - 3s] = text "{{title | 30 DAY CHALLENGE}}", style: title, position: center, animation: bounce

output to "fitness-reel.mp4", resolution: 1080x1920`,
  },
];

const TEMPLATE_VISUALS: Record<string, { badgeClassName: string; gradientClassName: string; symbol: string }> = {
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

export default function TemplatesPage() {
  const freeTemplates = SAMPLE_TEMPLATES.filter((template) => template.price === 0).length;

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
                  <div className="text-sm font-semibold text-slate-100">{SAMPLE_TEMPLATES.length} launch-ready presets</div>
                  <div className="text-xs text-slate-500">Wedding, travel, and fitness flows are ready to personalize.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 text-slate-100">
                  <Download className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {freeTemplates} complimentary preset{freeTemplates === 1 ? '' : 's'}
                  </div>
                  <div className="text-xs text-slate-500">Open a template, fill the placeholders, then continue in the editor.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {SAMPLE_TEMPLATES.map((template) => {
            const visual = TEMPLATE_VISUALS[template.category];

            return (
              <Card
                key={template.id}
                className="flex h-full flex-col overflow-hidden border-slate-800 bg-slate-950/55 text-slate-100 shadow-none transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-950/70"
              >
                <div className={cn('flex h-48 items-center justify-center border-b border-slate-800 text-6xl', visual.gradientClassName)}>
                  <span aria-hidden="true">{visual.symbol}</span>
                </div>

                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-slate-50">{template.title}</CardTitle>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{template.description}</p>
                    </div>
                    <Badge variant="outline" className={cn('capitalize', visual.badgeClassName)}>
                      {template.category}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="flex items-center justify-between pt-0">
                  <div>
                    <div className="text-lg font-semibold text-slate-50">
                      {template.price === 0 ? 'Free' : `$${(template.price / 100).toFixed(2)}`}
                    </div>
                    <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Template access</div>
                  </div>

                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 text-sm font-medium text-slate-200">
                      <Download className="h-3.5 w-3.5" />
                      {template.downloads}
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
          })}
        </div>
      </main>
    </div>
  );
}
