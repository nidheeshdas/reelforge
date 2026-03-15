# ReelForge Technical Documentation

## Project Overview
- **Name**: ReelForge
- **Type**: Web-based video creation platform
- **Target Users**: Content creators, beginners, reel makers (YouTube, TikTok, Instagram)
- **Core Feature**: Text-based video editing with GLSL shader support

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: CSS Variables + custom CSS
- **State Management**: React hooks (useState, useCallback, useEffect)
- **Authentication**: NextAuth.js with credentials provider

### Backend
- **Runtime**: Bun.js
- **Framework**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js

### Key Dependencies
```json
{
  "next": "^14.2.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@radix-ui/react-tabs": "^1.1.13",
  "@radix-ui/react-avatar": "^1.1.11",
  "@radix-ui/react-separator": "^1.1.8",
  "@radix-ui/react-slot": "^1.2.4",
  "class-variance-authority": "latest",
  "tailwind-merge": "latest",
  "clsx": "latest",
  "lucide-react": "^0.564.0",
  "three": "^0.162.0",
  "@prisma/client": "^5.10.0",
  "prisma": "^5.10.0",
  "next-auth": "^4.24.13",
  "peggy": "^5.0.6"
}
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Home page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── editor/
│   │   └── page.tsx                # Main editor page
│   ├── assets/
│   │   └── page.tsx                # Assets management page
│   ├── templates/
│   │   ├── page.tsx                # Templates gallery
│   │   └── [id]/page.tsx          # Template detail
│   ├── account/
│   │   └── page.tsx                # Account settings
│   └── api/
│       ├── assets/
│       │   ├── route.ts            # Assets CRUD
│       │   └── samples/route.ts    # Sample assets
│       ├── render/route.ts         # Video rendering
│       └── auth/                   # Auth routes
├── components/
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── tabs.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   └── badge.tsx
│   ├── AssetLibrary.tsx            # Asset management UI
│   ├── Providers.tsx               # Session providers
│   └── theme-provider.tsx          # Theme provider
├── lib/
│   ├── utils.ts                   # cn() utility
│   ├── db/prisma.ts               # Prisma client
│   ├── auth/                      # Auth utilities
│   ├── preview/
│   │   ├── PreviewPlayer.tsx      # Video preview component
│   │   └── engine.ts              # Three.js preview engine
│   ├── llm/                       # LLM integration
│   └── integrations/              # Cloud storage integrations
├── parser/
│   ├── index.ts                   # Parser exports
│   ├── grammar/
│   │   ├── vidscript.peggy        # PEG grammar
│   │   └── parser.js              # Compiled parser
│   └── types/vidscript.ts         # TypeScript types
├── shaders/
│   └── library.ts                 # GLSL shader library
└── types/
    └── vidscript.ts               # VidScript types
```

## UI Components

### shadcn/ui Components
The project uses shadcn/ui-style components built with Radix UI primitives. Required CSS variables in `globals.css`:

```css
:root {
  --background: #0a0a0b;
  --foreground: #fafafa;
  --card: #141416;
  --card-foreground: #fafafa;
  --primary: #6366f1;
  --primary-foreground: #fafafa;
  --secondary: #1c1c1f;
  --secondary-foreground: #fafafa;
  --muted: #1c1c1f;
  --muted-foreground: #a1a1aa;
  --accent: #f472b6;
  --accent-foreground: #fafafa;
  --destructive: #ef4444;
  --destructive-foreground: #fafafa;
  --border: #27272a;
  --input: #27272a;
  --ring: #6366f1;
}
```

## VidScript DSL

### Basic Syntax
```vidscript
# Input files
input main_video = "/samples/test-video.mp4"
input music = "/samples/test-audio.mp3"

# Video operations
[0s - 30s] = main_video.Trim(0, 30)
[0s - 30s] = filter "sepia", intensity: 0.4

# Audio
[0s - 30s] = audio music, volume: 0.6, fade_out: 2s

# Text overlays
[2s - 5s] = text "My Reel", style: title, position: center

# Output
output to "output.mp4", resolution: 1080x1920
```

### Parser
- Uses Peggy (PEG parser generator)
- Grammar file: `src/parser/grammar/vidscript.peggy`
- Compiled to: `src/parser/grammar/parser.js`
- Build command: `npm run parser:build`

## Assets System

### Storage
- Local files stored in `./public/uploads/`
- Sample files in `./public/samples/`
- Database metadata in PostgreSQL via Prisma

### Asset API Endpoints
- `GET /api/assets` - List user assets (requires auth)
- `POST /api/assets` - Upload new asset (requires auth)
- `DELETE /api/assets` - Delete asset (requires auth)
- `GET /api/assets/samples` - Get sample assets (public)

### Sample Assets
Located in `public/samples/`:
- `test-video.mp4`
- `test-audio.mp3`

## Authentication

### NextAuth.js Configuration
- Credentials provider for email/password
- Session management with JWT
- Protected routes via middleware

### Protected Routes
```typescript
// src/middleware.ts
export const config = {
  matcher: [
    '/account/:path*',
    '/templates/:path*',
  ],
};
```

Note: `/editor` was temporarily removed from protected routes for testing.

## Preview Engine

### Three.js WebGL Preview
- Real-time video preview in browser
- Support for video textures, filters, and text overlays
- Frame-by-frame rendering

### Built-in Filters
- monochrome
- sepia
- blur
- chromatic
- glitch
- vignette
- contrast
- saturation
- brightness

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build parser
npm run parser:build

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Run tests
npm run test

# Lint
npm run lint
```

## Known Issues & Solutions

### 1. Parser "name.join is not a function" Error
- **Cause**: Peggy parser not rebuilt after changes
- **Solution**: Run `npm run parser:build` to recompile the grammar

### 2. Assets not loading for unauthenticated users
- **Solution**: Created `/api/assets/samples` endpoint for public sample assets

### 3. UI Components missing
- **Solution**: Created shadcn/ui-style components in `src/components/ui/`

## API Routes

### Assets
- `GET /api/assets` - List user assets
- `POST /api/assets` - Upload asset
- `DELETE /api/assets?id=<id>` - Delete asset
- `GET /api/assets/samples` - Get sample assets

### Templates
- `GET /api/templates` - List templates
- `GET /api/templates/:id` - Get template

### Rendering
- `POST /api/render` - Start render job
- `GET /api/render/:id` - Get render status

## Database Schema

### Key Models
- **User**: Authentication and profile
- **Asset**: User-uploaded files
- **Template**: Reusable video templates
- **Render**: Render jobs
- **Shader**: Custom GLSL shaders
- **ApiKey**: LLM provider API keys
- **ConnectedApp**: OAuth connections (GitHub, Google Drive, Dropbox)
