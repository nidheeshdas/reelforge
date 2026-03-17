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

### Required for local + production

- `DATABASE_URL` - PostgreSQL connection string used by Prisma and auth.
- `NEXTAUTH_SECRET` - Required for NextAuth session signing; use a long random value in production.
- `NEXTAUTH_URL` - Public base URL for the app; must be the externally reachable HTTPS URL in production so OAuth callbacks resolve correctly.
- `ENCRYPTION_KEY` - 64-char hex key used to encrypt stored provider tokens and API keys.

### Required for the current render path

- `FFMPEG_PATH` / `FFPROBE_PATH` - Optional overrides if `ffmpeg` and `ffprobe` are not on the default PATH. The production Docker image installs both at `/usr/bin`.
- `UPLOAD_DIR` - Directory for uploaded assets. Defaults to `./public/uploads`. Mount this as persistent storage in production.
- `RENDER_DIR` - Directory for generated render artifacts. Defaults to `./public/renders`. Mount this as persistent storage in production.
- `REDIS_HOST` / `REDIS_PORT` - Redis connection settings for the existing queue-related code paths.

### Optional integrations

- `GITHUB_ID` / `GITHUB_SECRET` - GitHub OAuth app credentials for repository import.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials for Drive import.
- `DROPBOX_APP_KEY` / `DROPBOX_APP_SECRET` - Dropbox OAuth credentials for Dropbox import.
- `OPENAI_API_KEY` / `NEXT_PUBLIC_OPENAI_API_KEY` - Optional LLM integration keys.
- `R2_*` - Planned object-storage settings. This deployment slice does **not** switch uploads/renders to R2 yet.

## Development

```bash
# Generate parser from grammar
npm run parser:build

# Run Prisma migrations
npm run db:migrate

# Start worker (separate terminal, optional / legacy path)
node src/lib/queue/worker.js
```

## Production Deployment Slice

This repository now includes a minimal production container path for the **current single-instance architecture**:

- `Dockerfile` - production-oriented image with ffmpeg/runtime libraries and `next start`.
- `docker-compose.prod.yml` - app + Postgres + Redis with persistent Docker volumes for uploads and renders.
- `GET /api/health` - lightweight health endpoint used by the production compose health check.

### Start production locally

```bash
docker compose -f docker-compose.prod.yml up --build
```

Then open `http://localhost:3000`.

### Important current limitations

- **Persistent storage is mandatory**: uploaded assets and generated renders are still written to local disk. If the app container is recreated without mounted storage, user uploads and render artifacts are lost.
- **Single-instance constraint**: this slice assumes one web process writing to one shared local filesystem path. Running multiple app instances without moving uploads/renders to object storage or a shared filesystem will cause inconsistent artifact availability.
- **Use the download API for artifacts**: render downloads are supported via `/api/render/download`; the system is not yet an object-storage-backed artifact service.
- **No worker split yet**: queue-worker separation, remote artifact storage, Stripe, and full monitoring/alerting are intentionally out of scope for this deployment slice.

### Operational notes

- Put the app behind a reverse proxy / TLS terminator in real production and set `NEXTAUTH_URL` to the public HTTPS origin.
- Run Prisma migrations as part of deploy automation before routing traffic to a new release.
- Back up the Postgres volume and the mounted upload/render volumes together until artifacts move to object storage.

## Documentation

- [Template docs index](docs/templates/README.md)
- [Template system technical notes](docs/templates/template-system.md)
- [Template user guide](docs/templates/template-user-guide.md)

## License

MIT
