import Link from 'next/link';

const sections = [
  {
    title: 'Account data',
    body: 'We store the account information you provide to authenticate you and operate the product, including your email address, display name, and encrypted credentials where applicable.',
  },
  {
    title: 'Billing and audit data',
    body: 'When you purchase credits, we store the resulting billing identifiers and a credit ledger so your balance can be fulfilled and audited correctly.',
  },
  {
    title: 'Product usage',
    body: 'We retain render, template, and connected-service metadata needed to provide your workspace and support production operations.',
  },
  {
    title: 'Communications',
    body: 'Transactional emails such as password resets, verification messages, purchase receipts, and render failure notices are sent only for product operations.',
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-border/70 bg-card/70 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.24em] text-primary">Legal</div>
            <h1 className="mt-3 text-4xl font-semibold">Privacy Policy</h1>
          </div>
          <Link href="/terms" className="btn btn-outline">
            Terms of service
          </Link>
        </div>
        <p className="mt-6 text-sm leading-7 text-muted-foreground">
          This summary explains the minimum data handling for the current ReelForge release.
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
