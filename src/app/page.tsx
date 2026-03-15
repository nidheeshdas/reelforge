import Link from 'next/link';

export default function Home() {
  return (
    <main className="page">
      <header className="header">
        <div className="header-content">
          <Link href="/" className="logo">
            <span className="logo-icon">▶</span>
            ReelForge
          </Link>
          <nav className="nav">
            <Link href="/editor" className="btn btn-primary">
              New Project
            </Link>
            <Link href="/templates" className="btn btn-ghost">
              Templates
            </Link>
            <Link href="/assets" className="btn btn-ghost">
              Assets
            </Link>
          </nav>
        </div>
      </header>

      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Text-Based Video Editing</div>
          <h1 className="hero-title">
            Create videos with
            <span className="gradient-text"> plain text</span>
          </h1>
          <p className="hero-description">
            Write your video in simple, readable code. No timeline, no complexity. 
            Just you and your creativity.
          </p>
          <div className="hero-actions">
            <Link href="/editor" className="btn btn-primary btn-lg">
              Start Creating
            </Link>
            <Link href="#example" className="btn btn-outline btn-lg">
              See Example
            </Link>
          </div>
        </div>
        
        <div className="hero-code">
          <div className="code-header">
            <span className="code-dot red"></span>
            <span className="code-dot yellow"></span>
            <span className="code-dot green"></span>
            <span className="code-title">video.vs</span>
          </div>
          <pre className="code-content">{`# Your first video
input video = "vacation.mp4"
input music = "sunset.mp3"

# Trim to 30 seconds
[0s - 30s] = video.Trim(0, 30)

# Apply vintage effect
[0s - 30s] = filter "sepia", intensity: 0.4

# Add background music
[0s - 30s] = audio music, volume: 0.5

# Add title text
[1s - 4s] = text "My Vacation",
    style: title,
    position: center

# Export as reel
output to "reel.mp4", resolution: 1080x1920`}</pre>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">Why ReelForge?</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">✍️</div>
            <h3>Text-Based</h3>
            <p>Write videos in plain English. Simple time markers like [0 - 10] mean 0 to 10 seconds. No steep learning curve.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎨</div>
            <h3>GLSL Shaders</h3>
            <p>Apply cinematic filters or write your own custom GLSL shaders. GPU-accelerated for real-time preview.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>Templates</h3>
            <p>Start with community templates or create your own. Fill in placeholders, export in seconds.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h3>AI Assistant</h3>
            <p>Describe what you want in plain English. Our AI converts it to VidScript code automatically.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📱</div>
            <h3>All Formats</h3>
            <p>Export to any format. Reels (9:16), Stories, Square posts, YouTube landscape - we got you covered.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h3>GPU Rendering</h3>
            <p>Harness the power of WebGL for blazing fast rendering. Preview in real-time, export in minutes.</p>
          </div>
        </div>
      </section>

      <section id="example" className="example">
        <h2 className="section-title">How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Write</h3>
              <p>Describe your video in simple VidScript syntax. Think of it like writing a recipe.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Preview</h3>
              <p>See your video render in real-time. Tweak timings, adjust effects, iterate fast.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Export</h3>
              <p>Hit export and get a professional MP4. Ready for YouTube, TikTok, or Instagram.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta">
        <h2>Ready to create?</h2>
        <p>Start with a blank project or choose from templates.</p>
        <div className="cta-actions">
          <Link href="/editor" className="btn btn-primary btn-lg">
            New Project
          </Link>
          <Link href="/templates" className="btn btn-outline btn-lg">
            Browse Templates
          </Link>
        </div>
      </section>

      <footer className="footer">
        <p>ReelForge — Video creation through code</p>
      </footer>
    </main>
  );
}
