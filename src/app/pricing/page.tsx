'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, CheckCircle2, Coins, Loader2, Sparkles } from 'lucide-react';
import { CREDIT_PACKS } from '@/lib/billing/catalog';
import { getMonetizedSurfaceNotice } from '@/lib/support-matrix/capabilities';

const supportNotice = getMonetizedSurfaceNotice();

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null);
  const checkoutState = searchParams.get('checkout');

  const banner = useMemo(() => {
    if (checkoutState === 'cancelled') {
      return {
        tone: 'amber',
        title: 'Checkout cancelled',
        description: 'No charge was made. You can revisit a pack whenever you are ready.',
      } as const;
    }

    return null;
  }, [checkoutState]);

  async function handleCheckout(packId: string) {
    if (!session?.user) {
      router.push(`/auth/login?callbackUrl=${encodeURIComponent('/pricing')}`);
      return;
    }

    setCheckoutPackId(packId);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packId }),
      });

      const data = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || 'Unable to start checkout.');
      }

      window.location.href = data.url;
    } catch (error) {
      console.error('Checkout launch error:', error);
      alert(error instanceof Error ? error.message : 'Unable to start checkout.');
      setCheckoutPackId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="text-sm font-semibold">ReelForge pricing</div>
            <div className="text-xs text-muted-foreground">One-time credit packs for authenticated exports</div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/templates" className="btn btn-ghost">
              Templates
            </Link>
            <Link href="/account?tab=billing" className="btn btn-outline">
              Billing
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10">
        <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/70 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.15)] lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Credit packs
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight">Pay only when you need more render starts.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              ReelForge uses one-time credit packs in this launch slice. Every export attempt starts by reserving 1 credit. If a render fails, that credit is refunded automatically.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'One-time purchases — no subscriptions or billing portal yet.',
                'Webhook-backed fulfillment with auditable credit transactions.',
                'Render failures refund credits automatically.',
                'Billing history and live balance stay visible in your account.',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/10 p-6 text-amber-950 dark:text-amber-100">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700 dark:text-amber-200">{supportNotice.title}</div>
            <p className="mt-3 text-sm leading-6 text-amber-900/80 dark:text-amber-50/85">{supportNotice.description}</p>
            <p className="mt-4 text-sm leading-6 text-amber-900/70 dark:text-amber-50/75">
              Templates, pricing, and billing surfaces stay honest about the current export path: do not assume guaranteed paid audio or image deliverables yet.
            </p>
          </div>
        </section>

        {banner ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            <div className="font-semibold">{banner.title}</div>
            <div className="mt-1 opacity-80">{banner.description}</div>
          </div>
        ) : null}

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <article
              key={pack.id}
              className={`relative overflow-hidden rounded-[1.75rem] border p-6 ${pack.featured ? 'border-primary/40 bg-primary/5 shadow-[0_24px_70px_rgba(59,130,246,0.14)]' : 'border-border/70 bg-card/70'}`}
            >
              {pack.featured ? (
                <div className="absolute right-4 top-4 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
                  Most popular
                </div>
              ) : null}
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-border/70 bg-background/80 p-3 text-primary">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{pack.name}</h2>
                  <p className="text-sm text-muted-foreground">{pack.description}</p>
                </div>
              </div>
              <div className="mt-8 flex items-end gap-2">
                <div className="text-4xl font-semibold">{pack.credits}</div>
                <div className="pb-1 text-sm uppercase tracking-[0.22em] text-muted-foreground">credits</div>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">1 render start = 1 credit</div>
              <div className="mt-8 flex items-end justify-between gap-4">
                <div>
                  <div className="text-3xl font-semibold">${(pack.priceCents / 100).toFixed(2)}</div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">one-time</div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => void handleCheckout(pack.id)}
                  disabled={checkoutPackId === pack.id || status === 'loading'}
                >
                  {checkoutPackId === pack.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : session?.user ? (
                    <>
                      Buy credits
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Sign in to buy
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-foreground">Loading pricing…</div>}>
      <PricingPageContent />
    </Suspense>
  );
}
