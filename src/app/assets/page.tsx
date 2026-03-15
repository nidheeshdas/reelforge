'use client';

import { useEffect } from 'react';
import { AssetLibrary } from '@/components/AssetLibrary';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function AssetsPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'unauthenticated') {
      window.location.href = '/auth/login?callbackUrl=/assets';
    }
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="border-b" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--fg)', textDecoration: 'none' }}>
              <span className="w-8 h-8 rounded flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>▶</span>
              ReelForge
            </Link>
            <nav className="flex items-center gap-2 ml-8">
              <Link href="/editor" className="btn btn-ghost">
                Editor
              </Link>
              <Link href="/templates" className="btn btn-ghost">
                Templates
              </Link>
              <span className="btn btn-primary" style={{ opacity: 0.8 }}>Assets</span>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/account" className="btn btn-ghost">
              Account
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--fg)' }}>Assets</h1>
          <p className="mt-1" style={{ color: 'var(--fg-muted)' }}>
            Upload and manage your video, audio, and image files
          </p>
        </div>
        
        <div className="rounded-lg border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', minHeight: '500px' }}>
          <AssetLibrary />
        </div>
      </main>
    </div>
  );
}
