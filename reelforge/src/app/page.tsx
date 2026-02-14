import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <header className="header container">
        <h1>ReelForge</h1>
        <nav>
          <Link href="/editor" className="btn btn-primary" style={{ marginRight: '0.5rem' }}>
            New Project
          </Link>
          <Link href="/templates" className="btn btn-secondary">
            Templates
          </Link>
        </nav>
      </header>

      <div className="container">
        <section style={{ padding: '4rem 0', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
            Create Videos with Plain Text
          </h2>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Text-based video editing for creators. Simple, powerful, extensible.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="/editor" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1.125rem' }}>
              Start Creating
            </Link>
            <a href="https://github.com" className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '1.125rem' }}>
              View on GitHub
            </a>
          </div>
        </section>

        <section style={{ padding: '2rem 0' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Features</h3>
          <div className="grid grid-cols-3">
            <div className="card">
              <h4 style={{ marginBottom: '0.5rem' }}>Text-Based Editing</h4>
              <p style={{ color: 'var(--text-muted)' }}>
                Write your video in plain text with simple time markers.
                No complex timeline editors.
              </p>
            </div>
            <div className="card">
              <h4 style={{ marginBottom: '0.5rem' }}>GLSL Shaders</h4>
              <p style={{ color: 'var(--text-muted)' }}>
                Use built-in filters or write custom GLSL shaders.
                GPU-accelerated rendering.
              </p>
            </div>
            <div className="card">
              <h4 style={{ marginBottom: '0.5rem' }}>Templates</h4>
              <p style={{ color: 'var(--text-muted)' }}>
                Browse community templates or create your own.
                Fill in placeholders, export.
              </p>
            </div>
          </div>
        </section>

        <section style={{ padding: '2rem 0' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Example</h3>
          <div className="card" style={{ background: '#1e293b', color: '#e2e8f0', fontFamily: 'monospace' }}>
            <pre style={{ whiteSpace: 'pre-wrap' }}>
{`# Wedding Reel
input video = "wedding.mp4"
input music = "song.mp3"

[0s - 30s] = video.Trim(0, 30)
[0s - 30s] = filter "sepia", intensity: 0.4
[0s - 30s] = audio music, volume: 0.6

[2s - 5s] = text "The Wedding", 
    style: title, 
    position: center

output to "reel.mp4", resolution: 1080x1920`}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
