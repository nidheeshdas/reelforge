'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TEMPLATES: Record<string, any> = {
  '1': {
    id: 1,
    title: 'Wedding Reel',
    description: 'Beautiful wedding highlights with romantic effects',
    price: 5,
    vidscript: `# Wedding Reel Template
input main_video = {{video1}}
input music = {{music | "default.mp3"}}

[0s - {{duration | 30}}s] = main_video.Trim(0, {{duration | 30}})
[0s - end] = filter {{effect | "sepia"}}, intensity: 0.4

[0s - end] = audio music, volume: {{volume | 0.6}}, fade_out: 3s

[1s - 4s] = text "{{title | The Wedding}}", style: title, position: center
[5s - end] = text "{{subtitle | Mr. & Mrs. Smith}}", style: subtitle, position: bottom-center

output to "wedding-reel.mp4", resolution: 1080x1920`,
    placeholders: [
      { name: 'video1', type: 'video', label: 'Main Video', required: true },
      { name: 'music', type: 'audio', label: 'Background Music', required: false },
      { name: 'duration', type: 'number', label: 'Duration (seconds)', default: 30 },
      { name: 'effect', type: 'select', label: 'Effect', options: ['none', 'sepia', 'monochrome', 'vintage'], default: 'sepia' },
      { name: 'volume', type: 'number', label: 'Music Volume', default: 0.6 },
      { name: 'title', type: 'text', label: 'Title Text', default: 'The Wedding' },
      { name: 'subtitle', type: 'text', label: 'Subtitle', default: 'Mr. & Mrs. Smith' },
    ],
  },
};

export default function TemplateDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const template = TEMPLATES[params.id];
  const [values, setValues] = useState<Record<string, any>>({});
  const [previewCode, setPreviewCode] = useState('');

  if (!template) {
    return (
      <div className="container" style={{ padding: '2rem' }}>
        <h1>Template not found</h1>
        <Link href="/templates" className="btn btn-primary">Back to Templates</Link>
      </div>
    );
  }

  const handleValueChange = (name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleUseTemplate = () => {
    let code = template.vidscript;
    Object.entries(values).forEach(([key, value]) => {
      code = code.replace(new RegExp(`\\{\\{${key}(?:\\s*\\|\\s*[^}]+)?\\}\\}`, 'g'), value || '');
    });
    setPreviewCode(code);
    router.push(`/editor?code=${encodeURIComponent(code)}`);
  };

  return (
    <div className="container" style={{ padding: '2rem' }}>
      <Link href="/templates" style={{ color: 'var(--text-muted)' }}>← Back to Templates</Link>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
        <div>
          <div
            style={{
              height: '300px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '5rem',
            }}
          >
            💒
          </div>
        </div>
        
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>{template.title}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{template.description}</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            {template.price === 0 ? 'Free' : `$${(template.price / 100).toFixed(2)}`}
          </p>
          
          <h3 style={{ marginBottom: '1rem' }}>Fill Placeholders</h3>
          
          {template.placeholders.map((placeholder: any) => (
            <div key={placeholder.name} style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                {placeholder.label}
                {!placeholder.required && <span style={{ color: 'var(--text-muted)' }}> (optional)</span>}
              </label>
              
              {placeholder.type === 'text' && (
                <input
                  type="text"
                  className="input"
                  defaultValue={placeholder.default}
                  onChange={(e) => handleValueChange(placeholder.name, e.target.value)}
                />
              )}
              
              {placeholder.type === 'number' && (
                <input
                  type="number"
                  className="input"
                  defaultValue={placeholder.default}
                  onChange={(e) => handleValueChange(placeholder.name, e.target.value)}
                />
              )}
              
              {placeholder.type === 'select' && (
                <select
                  className="input"
                  defaultValue={placeholder.default}
                  onChange={(e) => handleValueChange(placeholder.name, e.target.value)}
                >
                  {placeholder.options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              )}
              
              {placeholder.type === 'video' && (
                <div>
                  <input type="file" accept="video/*" className="input" />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Upload your video file
                  </p>
                </div>
              )}
              
              {placeholder.type === 'audio' && (
                <div>
                  <input type="file" accept="audio/*" className="input" />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Upload audio file
                  </p>
                </div>
              )}
            </div>
          ))}
          
          <button onClick={handleUseTemplate} className="btn btn-primary" style={{ width: '100%' }}>
            {template.price === 0 ? 'Use Template' : 'Purchase & Use'}
          </button>
        </div>
      </div>
    </div>
  );
}
