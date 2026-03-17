import Link from 'next/link';

const sections = [
  {
    title: 'Using ReelForge',
    body: 'ReelForge is provided for lawful creative and production workflows. You are responsible for the scripts, assets, and media you upload or generate through the service.',
  },
  {
    title: 'Billing and credits',
    body: 'Credit purchases are one-time transactions in this launch slice. Credits are consumed when a render starts. Failed renders are automatically refunded when the failure is detected.',
  },
  {
    title: 'Templates and content',
    body: 'Public templates in the current product slice are free to use. Creator payouts, paid template entitlements, and subscriptions are not part of this release.',
  },
  {
    title: 'Availability',
    body: 'We may change or improve the service over time. Some advanced export capabilities, especially for audio and image-heavy compositions, are still evolving and may be limited.',
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-border/70 bg-card/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-primary">Legal</div>
            <h1 className="mt-3 text-4xl font-semibold">Terms of Service</h1>
          </div>
          <Link href="/privacy" className="btn btn-outline">
            Privacy policy
          </Link>
        </div>
        <p className="mt-6 text-sm leading-7 text-muted-foreground">
          These terms describe the basic rules for using ReelForge during the current launch phase.
        </p>
        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-border/70 bg-background/70 p-5">
              <h2 className="text-xl font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
