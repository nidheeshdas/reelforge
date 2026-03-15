'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Cloud, FolderOpen, Sparkles } from 'lucide-react';
import { AssetLibrary } from '@/components/AssetLibrary';

export default function AssetsPage() {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #070c16 0%, #0a1221 100%)' }}>
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
              <div className="text-sm font-semibold text-slate-100">Asset workspace</div>
              <div className="text-xs text-slate-500">Media library, samples, and cloud imports</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/editor" className="btn btn-ghost">
              Editor
            </Link>
            <Link href="/templates" className="btn btn-ghost">
              Templates
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
              Asset management
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-slate-50">Build your project library in one place</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
              Upload clips, browse bundled samples, and prepare your cloud sources before dropping assets into the ReelForge editor.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 text-slate-100">
                  <FolderOpen className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">
                    {session ? 'Signed in workspace' : status === 'loading' ? 'Checking session…' : 'Sample-first mode'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {session ? 'Your local uploads and connections are ready below.' : 'You can browse sample assets without signing in.'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-2.5 text-slate-100">
                  <Cloud className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-100">Cloud imports</div>
                  <div className="text-xs text-slate-500">
                    Google Drive and Dropbox can be connected once their OAuth keys are configured.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-[rgba(7,11,20,0.92)] shadow-[0_24px_80px_rgba(4,9,20,0.28)]">
          <AssetLibrary mode="page" />
        </div>
      </main>
    </div>
  );
}
