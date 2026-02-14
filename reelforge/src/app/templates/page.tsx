import Link from 'next/link';

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

export default function TemplatesPage() {
  return (
    <main>
      <header className="header container">
        <h1>Templates</h1>
        <nav>
          <Link href="/editor" className="btn btn-primary">
            Create New
          </Link>
        </nav>
      </header>

      <div className="container">
        <div className="grid grid-cols-3">
          {SAMPLE_TEMPLATES.map((template) => (
            <div key={template.id} className="card">
              <div
                style={{
                  height: '200px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '0.5rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '3rem',
                }}
              >
                {template.category === 'celebration' ? '💒' : template.category === 'travel' ? '✈️' : '💪'}
              </div>
              <h3 style={{ marginBottom: '0.5rem' }}>{template.title}</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
                {template.description}
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold' }}>
                  {template.price === 0 ? 'Free' : `$${(template.price / 100).toFixed(2)}`}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  {template.downloads} downloads
                </span>
              </div>
              <Link
                href={`/templates/${template.id}`}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1rem' }}
              >
                Use Template
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
