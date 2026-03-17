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

- **Frontend**: Next.js 16 (App Router)
- **Backend**: Next.js API routes
- **Database**: PostgreSQL + Prisma
- **Parser**: Peggy (PEG grammar)
- **Rendering**: Three.js + headless-gl + WebCodecs
- **Shaders**: Custom GLSL library
- **Deployment targets**: Docker today, Cloudflare Workers/Containers/Queues scaffolded side-by-side

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/                # API routes
│   ├── editor/             # Code editor page
│   └── templates/          # Template gallery
├── lib/
│   ├── auth/               # NextAuth config
│   ├── billing/            # Credits + Stripe ledgering
│   ├── db/                 # Prisma client
│   ├── queue/              # Legacy BullMQ queue path
│   └── render-dispatch/    # Render dispatch seam (inline / BullMQ / Cloudflare Queue)
├── parser/
│   ├── vidscript.peggy     # PEG grammar
│   └── index.ts            # Parser wrapper
├── render/
│   ├── webgl-renderer.ts   # Headless WebGL export runtime
│   └── worker.ts           # Older ffmpeg render worker path
└── types/
    └── vidscript.ts        # TypeScript types

cloudflare/
└── render-worker/          # Cloudflare Queues + Containers control worker scaffold
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
- `REDIS_HOST` / `REDIS_PORT` - Redis connection settings for the legacy BullMQ queue path.
- `RENDER_DISPATCH_MODE` - `inline` by default. The new dispatch seam also supports `bullmq` and `cloudflare-queue` when those runtimes are enabled.

### Optional integrations

- `GITHUB_ID` / `GITHUB_SECRET` - GitHub OAuth app credentials for repository import.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth credentials for Drive import.
- `DROPBOX_APP_KEY` / `DROPBOX_APP_SECRET` - Dropbox OAuth credentials for Dropbox import.
- `OPENAI_API_KEY` / `NEXT_PUBLIC_OPENAI_API_KEY` - Optional LLM integration keys.
- `R2_*` - Planned object-storage settings. This deployment slice does **not** switch uploads/renders to R2 yet.
- `REELFORGE_INTERNAL_TOKEN` - Shared secret reserved for future signed callbacks between the app Worker and render-control Worker/container.

## Development

```bash
# Generate parser from grammar
npm run parser:build

# Run Prisma migrations
npm run db:migrate

# Start worker (separate terminal, optional / legacy path)
node src/lib/queue/worker.js
```

## Docker Production Path (existing)

This repository still includes the existing production container path for the **current single-instance architecture**:

- `Dockerfile` - production-oriented image with ffmpeg/runtime libraries and `next start`.
- `docker-compose.prod.yml` - app + Postgres + Redis with persistent Docker volumes for uploads and renders.
- `GET /api/health` - lightweight health endpoint used by the production compose health check.

### Start production locally

```bash
docker compose -f docker-compose.prod.yml up --build
```

Then open `http://localhost:3000`.

### Important current Docker limitations

- **Persistent storage is mandatory**: uploaded assets and generated renders are still written to local disk. If the app container is recreated without mounted storage, user uploads and render artifacts are lost.
- **Single-instance constraint**: this slice assumes one web process writing to one shared local filesystem path. Running multiple app instances without moving uploads/renders to object storage or a shared filesystem will cause inconsistent artifact availability.
- **Use the download API for artifacts**: render downloads are supported via `/api/render/download`; the system is not yet an object-storage-backed artifact service.
- **No worker split on Docker by default**: queue-worker separation and remote artifact storage remain optional / future work in the Docker path.

## Cloudflare Deployment Scaffold

This repository now also includes Cloudflare-native deployment scaffolding **alongside** the Docker path:

- `wrangler.jsonc` - root Workers config for the Next.js app via `@opennextjs/cloudflare`.
- `open-next.config.ts` - OpenNext Cloudflare adapter config.
- `cloudflare/render-worker/` - separate Worker that consumes render jobs from Cloudflare Queues and proxies them into Cloudflare Containers via a Durable Object binding.
- `src/lib/render-dispatch/` - render dispatch seam so the app can stay on `inline` locally while Cloudflare app builds switch to `cloudflare-queue`.
- `public/_headers` - static asset caching headers for OpenNext output.

### App Worker commands

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
```

These scripts set `NEXT_CLOUDFLARE=1` and `RENDER_DISPATCH_MODE=cloudflare-queue` so the app Worker builds against the Cloudflare queue path instead of the local inline renderer.

### Render control worker commands

```bash
npm run cf:render:dev
npm run cf:render:deploy
```

### Important current Cloudflare limitations

- The Next.js app Worker scaffolding now builds successfully, but the repo still needs the **final runtime compatibility pass** for Prisma/database access and production secret/runtime hardening before a full cutover.
- The Cloudflare app build intentionally aliases the Node-only BullMQ/inline render modules to safe stubs so native `canvas`/`gl` code does not enter the Worker bundle.
- The render-control Worker and container are production-structured scaffolds: queue ingress, Durable Object/container routing, health endpoints, and Docker image wiring are in place, but the **actual render execution callback flow remains intentionally deferred**.
- Upload/render artifact storage still needs an object-storage decision (R2 or equivalent) before multi-instance rendering is complete.

See [docs/deployment/cloudflare.md](docs/deployment/cloudflare.md) for the full Cloudflare setup, bindings, secrets, and deployment checklist.

## Operational notes

- Put the app behind a reverse proxy / TLS terminator in real production and set `NEXTAUTH_URL` to the public HTTPS origin.
- Run Prisma migrations as part of deploy automation before routing traffic to a new release.
- Back up the Postgres volume and the mounted upload/render volumes together until artifacts move to object storage.

## Documentation

- [Cloudflare deployment guide](docs/deployment/cloudflare.md)
- [Template docs index](docs/templates/README.md)
- [Template system technical notes](docs/templates/template-system.md)
- [Template user guide](docs/templates/template-user-guide.md)

## License

MIT
