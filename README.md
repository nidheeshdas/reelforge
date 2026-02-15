# ReelForge

Text-based video editor for creators. Write videos in plain text, apply GLSL shaders, export to reels.

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Start development server
npm run dev
```

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL + Prisma
- **Parser**: Peggy (PEG grammar)
- **Rendering**: Three.js + headless-gl + WebCodecs
- **Shaders**: Custom GLSL library

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes
│   ├── editor/            # Code editor page
│   └── templates/        # Template gallery
├── lib/
│   ├── db/                # Prisma client
│   ├── auth/              # NextAuth config
│   ├── queue/             # BullMQ queue
│   └── llm/               # LLM service
├── parser/
│   ├── vidscript.peggy   # PEG grammar
│   └── index.ts           # Parser wrapper
├── render/
│   └── worker.ts          # Video render worker
├── shaders/
│   └── library.ts         # Built-in GLSL shaders
└── types/
    └── vidscript.ts       # TypeScript types
```

## VidScript Syntax

```vidscript
# Input files
input video = "clip.mp4"
input music = "song.mp3"

# Time blocks [start - end]
[0 - 10] = video.Trim(0, 300)
[0 - 10] = filter "sepia", intensity: 0.6

# Audio
[0 - 10] = audio music, volume: 0.7

# Text overlay
[2 - 5] = text "Hello", style: title, position: center

# Output
output to "result.mp4", resolution: 1080x1920
```

## Environment Variables

Copy `.env.example` to `.env` and configure:

- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `REDIS_HOST/PORT` - For job queue

## Development

```bash
# Generate parser from grammar
npm run parser:build

# Run Prisma migrations
npm run db:migrate

# Start worker (separate terminal)
node src/lib/queue/worker.js
```

## License

MIT
