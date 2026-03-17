import type { Metadata } from 'next';
import Link from 'next/link';
import { Sora } from 'next/font/google';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CheckCircle2,
  Clapperboard,
  Gauge,
  Layers3,
  PlayCircle,
  SlidersHorizontal,
  Sparkles,
  Workflow,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
});

export const metadata: Metadata = {
  title: 'ReelForge | Reusable short-form video workflows',
  description:
    'Build short-form videos you can edit, reuse, and scale with VidScript, starter templates, previews, and export-ready formats.',
};

const proofPoints = [
  {
    title: 'Start with a real structure',
    description:
      'Open templates for promos, testimonials, memes, and launch clips instead of facing a blank timeline.',
  },
  {
    title: 'Keep every edit intentional',
    description:
      'Change timing, text, media, and effects in readable VidScript with previewable control.',
  },
  {
    title: 'Reuse what performs',
    description:
      'Save winning scripts as templates so the next cut starts with momentum, not repetition.',
  },
] as const;

const workflowSteps = [
  {
    title: 'Choose a starting point',
    description:
      'Start with a template or open a blank script when you already know the shot.',
    outcome:
      'Skip blank-page friction without giving up control over the result.',
  },
  {
    title: 'Direct the sequence',
    description:
      'Adjust scenes, timing, overlays, audio, and effects in readable VidScript.',
    outcome:
      'You shape the structure directly instead of nudging clips around a crowded timeline.',
  },
  {
    title: 'Preview and export',
    description:
      'Review the pacing, refine the details, and ship the format the channel needs.',
    outcome:
      'Reels, stories, square posts, and landscape outputs stay inside one workflow.',
  },
] as const;

const templateCategories = [
  {
    name: 'Product promo',
    description:
      'Feature callouts, launch clips, pricing moments, and campaign refreshes.',
    tokens: ['headline', 'hero clip', 'cta'],
  },
  {
    name: 'Testimonial cut',
    description:
      'Customer proof, before-and-after edits, and social proof sequences.',
    tokens: ['quote', 'speaker', 'brand mark'],
  },
  {
    name: 'Meme remix',
    description:
      'Fast loops, reaction edits, and repeatable content formats for socials.',
    tokens: ['hook', 'caption', 'punchline'],
  },
  {
    name: 'Artistic motion',
    description:
      'Shader-led looks, title sequences, and stylized transitions when the brand needs texture.',
    tokens: ['palette', 'texture', 'scene timing'],
  },
] as const;

const capabilities: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: 'Readable scripting',
    description:
      'VidScript keeps the sequence editable, reviewable, and easier to version as the video evolves.',
    icon: Workflow,
  },
  {
    title: 'Template reuse',
    description:
      'Convert a working sequence into a repeatable content system with placeholders for what changes next time.',
    icon: Layers3,
  },
  {
    title: 'Creative depth',
    description:
      'Use built-in effects and shader support when the brief calls for a stronger visual signature.',
    icon: Sparkles,
  },
  {
    title: 'Export-ready output',
    description:
      'Move from draft to channel-specific deliverables without rebuilding the project for every format.',
    icon: Gauge,
  },
];

const heroTemplates = ['Product promo', 'Testimonial cut', 'Meme remix', 'Artistic loop'] as const;
const placeholderTokens = ['hero_clip', 'headline', 'cta'] as const;
const outputFormats = ['9:16 Reels', '1:1 Square', '16:9 Landscape'] as const;

const heroSnippet = `# Launch reel template
input video = "{{hero_clip}}"
input music = "{{soundtrack | pulse.mp3}}"

[0s - 7s] = video.Trim(0, 7)
[0.7s - 3.6s] = text "{{headline}}"
    style: title
[3.8s - 6.4s] = text "{{cta}}"
    style: caption

output to "launch-reel.mp4", resolution: 1080x1920`;

export default function Home() {
  return (
    <main className="relative isolate overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 -z-10 h-[42rem] opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(circle at top left, rgba(99, 102, 241, 0.16), transparent 42%), radial-gradient(circle at 78% 0%, rgba(244, 114, 182, 0.08), transparent 28%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-[28rem] -z-10 h-[22rem] opacity-70"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(245, 158, 11, 0.08), transparent 24%)',
        }}
      />

      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3 text-foreground">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-sm font-semibold text-primary">
              RF
            </span>
            <span className="flex flex-col">
              <span className={cn(sora.className, 'text-base font-semibold tracking-[-0.03em]')}>
                ReelForge
              </span>
              <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Video workflows
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              <Link
                href="#workflow"
                className="rounded-full px-3 py-2 transition-colors hover:bg-card hover:text-foreground"
              >
                Workflow
              </Link>
              <Link
                href="/templates"
                className="rounded-full px-3 py-2 transition-colors hover:bg-card hover:text-foreground"
              >
                Templates
              </Link>
              <Link
                href="/assets"
                className="rounded-full px-3 py-2 transition-colors hover:bg-card hover:text-foreground"
              >
                Assets
              </Link>
            </nav>

            <Button
              asChild
              size="sm"
              className="rounded-full bg-foreground px-4 text-background shadow-none hover:bg-foreground/90"
            >
              <Link href="/editor">Open editor</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 sm:pb-24 sm:pt-20 lg:grid-cols-[minmax(0,1.03fr)_minmax(0,0.97fr)] lg:items-start lg:pb-28 lg:pt-24">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary">
            Reusable short-form video workflows
          </div>

          <div className="mt-8 space-y-6">
            <h1
              className={cn(
                sora.className,
                'max-w-4xl text-[clamp(3rem,6vw,5.7rem)] font-semibold leading-[0.96] tracking-[-0.05em]',
              )}
            >
              Build short-form videos you can edit, reuse, and scale.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
              Use readable VidScript and starter templates to create reels, ads, testimonials,
              and more with previews, effects, and exports built in. Faster than timeline
              editing. More reliable than one-shot AI prompts.
            </p>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
            <Button
              asChild
              size="lg"
              className="h-12 rounded-full bg-foreground px-6 text-background shadow-none hover:bg-foreground/90"
            >
              <Link href="/templates">
                Start with a template
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 rounded-full border-border/70 bg-background/50 px-6 text-foreground shadow-none hover:bg-card"
            >
              <Link href="/editor">
                <PlayCircle className="mr-2 h-4 w-4" />
                Open the editor
              </Link>
            </Button>
            <Link
              href="#workflow"
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              See how it works
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {proofPoints.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-border/60 bg-card/45 p-5 backdrop-blur-sm"
              >
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-x-6 bottom-0 top-10 -z-10 rounded-[2.25rem] bg-primary/10 blur-3xl" />
          <div className="rounded-[2rem] border border-border/70 bg-card/70 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Workflow proof
                </p>
                <h2
                  className={cn(
                    sora.className,
                    'mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground',
                  )}
                >
                  From reusable structure to export-ready cut
                </h2>
              </div>
              <div className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                Editable, not one-shot
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] border border-border/70 bg-background/55 p-5">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Clapperboard className="h-4 w-4 text-primary" />
                  Start from a real category
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {heroTemplates.map((template) => (
                    <span
                      key={template}
                      className="rounded-full border border-border/70 bg-card px-3 py-1 text-sm text-muted-foreground"
                    >
                      {template}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border/70 bg-background/55 p-5">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Shape the sequence in VidScript
                </div>
                <pre className="mt-4 overflow-x-auto rounded-[1.25rem] border border-border/70 bg-background px-4 py-4 text-[13px] leading-6 text-zinc-200">
                  <code>{heroSnippet}</code>
                </pre>
                <div className="mt-4 flex flex-wrap gap-2">
                  {placeholderTokens.map((token) => (
                    <span
                      key={token}
                      className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-primary"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border/70 bg-background/55 p-5">
                  <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <Gauge className="h-4 w-4 text-primary" />
                    Ship the format you need
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {outputFormats.map((format) => (
                      <span
                        key={format}
                        className="rounded-full border border-border/70 bg-card px-3 py-1 text-sm text-muted-foreground"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border/70 bg-background/55 p-5">
                  <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                    <Layers3 className="h-4 w-4 text-primary" />
                    Reuse what works next time
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    Save a working script as a template, swap the placeholders, and ship the next
                    cut without rebuilding the sequence from scratch.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start">
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Why teams move faster with ReelForge
            </p>
            <h2
              className={cn(
                sora.className,
                'text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-tight tracking-[-0.04em]',
              )}
            >
              Give every video a reusable structure before the timeline chaos starts.
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              ReelForge is strongest when you need both momentum and control. Start from a template
              or a prompt, direct the sequence in readable script, then keep the parts you want to
              reuse for the next campaign, post, or launch.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
            <article className="rounded-[2rem] border border-border/70 bg-background/60 p-7">
              <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Start from proven structures
              </div>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                Launch faster with templates for promos, testimonials, meme cuts, and artistic
                looks. You begin with something usable instead of a blank screen.
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-muted-foreground">
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  Placeholder-based reuse keeps changes focused on what actually varies.
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
                  The template library now ships with real starter categories, not mock content.
                </li>
              </ul>
            </article>

            <div className="grid gap-4">
              <article className="rounded-[2rem] border border-border/70 bg-background/60 p-7">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Workflow className="h-4 w-4 text-primary" />
                  Keep the sequence editable
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Timing, text, media, and effects stay visible in VidScript, so iteration feels
                  precise instead of fragile.
                </p>
              </article>

              <article className="rounded-[2rem] border border-border/70 bg-background/60 p-7">
                <div className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Turn wins into repeatable systems
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  A good script should become a reusable workflow, not a one-off asset you rebuild
                  under deadline pressure.
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto max-w-7xl px-6 py-20 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.66fr)_minmax(0,1.34fr)]">
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              From first idea to publish-ready video
            </p>
            <h2
              className={cn(
                sora.className,
                'text-[clamp(2rem,4vw,3.2rem)] font-semibold leading-tight tracking-[-0.04em]',
              )}
            >
              Move from concept to export without losing the thread of the story.
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              ReelForge works best when the workflow stays visible: start from something useful,
              shape the sequence directly, and only add depth where it improves the final cut.
            </p>
          </div>

          <div className="space-y-5">
            {workflowSteps.map((step, index) => (
              <article
                key={step.title}
                className="grid gap-4 border-t border-border/60 pt-5 md:grid-cols-[auto_minmax(0,1fr)_minmax(220px,0.8fr)] md:items-start md:gap-6"
              >
                <div
                  className={cn(
                    sora.className,
                    'text-xl font-semibold tracking-[-0.04em] text-primary',
                  )}
                >
                  0{index + 1}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground sm:text-base">
                    {step.description}
                  </p>
                </div>
                <p className="text-sm leading-6 text-muted-foreground/90">{step.outcome}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-24">
        <div className="grid gap-10 rounded-[2.25rem] border border-border/60 bg-card/40 p-8 backdrop-blur-sm lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:p-10">
          <div className="max-w-lg space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Templates that give you momentum
            </p>
            <h2
              className={cn(
                sora.className,
                'text-[clamp(2rem,4vw,3rem)] font-semibold leading-tight tracking-[-0.04em]',
              )}
            >
              Start fast, then save the parts you want to repeat.
            </h2>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              Pick a category, swap the placeholders, and get to a strong first version quickly.
              Once the structure works, turn it into your own reusable workflow for the next brief.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-foreground px-6 text-background shadow-none hover:bg-foreground/90"
              >
                <Link href="/templates">Browse templates</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-11 rounded-full border-border/70 bg-background/60 px-6 text-foreground shadow-none hover:bg-background"
              >
                <Link href="/editor">Start from scratch</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {templateCategories.map((category) => (
              <article
                key={category.name}
                className="rounded-[1.75rem] border border-border/70 bg-background/60 p-6"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
                  {category.name}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {category.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {category.tokens.map((token) => (
                    <span
                      key={token}
                      className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 sm:pb-20">
        <div className="grid gap-5 border-y border-border/60 py-8 md:grid-cols-2 xl:grid-cols-4">
          {capabilities.map((capability) => (
            <article key={capability.title} className="flex gap-4">
              <div className="mt-1 rounded-2xl border border-border/70 bg-card p-3 text-primary">
                <capability.icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
                  {capability.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {capability.description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-6">
          <div
            className="rounded-[2.5rem] border border-border/60 p-8 sm:p-10 lg:flex lg:items-end lg:justify-between lg:gap-10"
            style={{
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(244, 114, 182, 0.06), rgba(10, 10, 11, 0.96))',
            }}
          >
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Build with momentum
              </p>
              <h2
                className={cn(
                  sora.className,
                  'mt-4 text-[clamp(2rem,4vw,3.3rem)] font-semibold leading-tight tracking-[-0.04em]',
                )}
              >
                Start from a reusable workflow or open a blank canvas.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                Browse templates when you want speed. Open the editor when you already know the
                sequence you want to direct.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full bg-foreground px-6 text-background shadow-none hover:bg-foreground/90"
              >
                <Link href="/templates">
                  Browse templates
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-border/70 bg-background/55 px-6 text-foreground shadow-none hover:bg-background"
              >
                <Link href="/editor">Open editor</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>ReelForge - from reusable idea to publish-ready video.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/templates" className="transition-colors hover:text-foreground">
              Templates
            </Link>
            <Link href="/editor" className="transition-colors hover:text-foreground">
              Editor
            </Link>
            <Link href="/assets" className="transition-colors hover:text-foreground">
              Assets
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
