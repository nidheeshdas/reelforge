# Cloudflare deployment scaffold

This repo now includes Cloudflare-native deployment scaffolding **without removing** the existing Docker deployment path. The intent is to keep Docker usable today while setting up the target Cloudflare architecture:

1. **Next.js app** on **Cloudflare Workers** via `@opennextjs/cloudflare`
2. **Render control plane** on a separate **Worker + Durable Object**
3. **Render runtime** on **Cloudflare Containers**
4. **Render job dispatch** on **Cloudflare Queues**

## Files added for Cloudflare

- `wrangler.jsonc` - root config for the Next.js app Worker
- `open-next.config.ts` - OpenNext adapter config
- `.dev.vars.example` - local-only preview variables for Workers runtime emulation
- `public/_headers` - static asset caching headers for OpenNext output
- `src/lib/render-dispatch/*` - dispatch seam (`inline`, `bullmq`, `cloudflare-queue`)
- `cloudflare/render-worker/wrangler.jsonc` - render control worker config
- `cloudflare/render-worker/src/index.ts` - queue consumer + control worker entrypoint
- `cloudflare/render-worker/src/render-container.ts` - Durable Object / container class
- `cloudflare/render-worker/Dockerfile` - container image for Cloudflare Containers
- `cloudflare/render-worker/container/server.mjs` - health + stub render ingress server inside the container image

## Architecture

### 1) Next.js app Worker

The root `wrangler.jsonc` follows the current OpenNext/Cloudflare model:

- `main: .open-next/worker.js`
- `assets.directory: .open-next/assets`
- `compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"]`
- `WORKER_SELF_REFERENCE` service binding for OpenNext internals
- `RENDER_QUEUE` producer binding for render-job publishing
- `RENDER_DISPATCH_MODE: cloudflare-queue` for the deployed app Worker

Current scripts:

```bash
npm run cf:build
npm run cf:preview
npm run cf:deploy
npm run cf:upload
```

These commands set `NEXT_CLOUDFLARE=1` and `RENDER_DISPATCH_MODE=cloudflare-queue` so the Worker build does not bundle the local inline render runtime.

### 2) Render control Worker

The render control worker is intentionally separate from the Next.js app Worker. It owns:

- the **Cloudflare Queue consumer** for render jobs
- the **Durable Object / Container class binding**
- the **container proxy** that forwards a render job into the correct container instance

Current queue settings in `cloudflare/render-worker/wrangler.jsonc`:

- queue: `reelforge-render-jobs`
- batch size: `4`
- batch timeout: `10s`
- retries: `5`
- dead-letter queue: `reelforge-render-jobs-dlq`

### 3) Cloudflare Containers seam

`RenderContainer` extends `@cloudflare/containers` and gives ReelForge the expected Worker → Durable Object → Container seam.

Current scaffold behavior:

- starts a container image from `cloudflare/render-worker/Dockerfile`
- exposes `/health` and `/ping`
- accepts `POST /jobs/render`
- returns a `202` scaffold response

That means the control plane is wired, but the **actual render runtime migration is still deferred**. This is deliberate so the deployment slice stays surgical.

## Local development

### Existing local app development

Unchanged:

```bash
npm run dev
```

### Cloudflare app preview

```bash
cp .dev.vars.example .dev.vars
npm run cf:preview
```

Notes:

- `next dev` remains the fastest local UI loop.
- `cf:preview` is for validating Workers runtime packaging and the Cloudflare queue-dispatch path.
- `.dev.vars` is local-only and should not be committed.
- Local `npm run dev` remains on the inline renderer; Cloudflare app builds alias the BullMQ/inline render modules to safe stubs so native `canvas`/`gl` dependencies stay out of the Worker bundle.

### Render control worker dev

```bash
npm run cf:render:dev
```

For container builds or deploys, Docker must be running locally because Wrangler builds and pushes the container image.

## Required Cloudflare resources

Create or provision these resources before deploy:

### App Worker resources

- Worker service: `reelforge-app`
- Queue producer binding: `RENDER_QUEUE` -> `reelforge-render-jobs`
- Optional image binding: `IMAGES`
- Service binding: `RENDER_CONTROL` -> `reelforge-render-control`

### Render control worker resources

- Worker service: `reelforge-render-control`
- Durable Object class: `RenderContainer`
- Container image defined by `cloudflare/render-worker/Dockerfile`
- Queue consumer on `reelforge-render-jobs`
- Dead-letter queue: `reelforge-render-jobs-dlq`

## Secrets and env bindings

Set these with `wrangler secret put ...` rather than committing them:

### App Worker secrets

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `ENCRYPTION_KEY`
- OAuth secrets (`GITHUB_SECRET`, `GOOGLE_CLIENT_SECRET`, `DROPBOX_APP_SECRET`) as needed
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `REELFORGE_INTERNAL_TOKEN`

### Render control worker secrets

- `REELFORGE_INTERNAL_TOKEN`

> `REELFORGE_INTERNAL_TOKEN` is reserved for the next step where the container or control worker sends signed progress/completion callbacks back into the app.

## Deployment order

Recommended first-time deployment order:

```bash
# 1) Deploy the render control worker + container image
npm run cf:render:deploy

# 2) Build and deploy the Next.js app worker
npm run cf:deploy
```

If you are managing queues manually, create them before deploy:

```bash
npx wrangler queues create reelforge-render-jobs
npx wrangler queues create reelforge-render-jobs-dlq
```

## Image build / push expectations

When you run:

```bash
npm run cf:render:deploy
```

Wrangler will:

1. build `cloudflare/render-worker/Dockerfile` with local Docker
2. push the resulting image to Cloudflare's container registry
3. deploy the render control Worker
4. wire the Durable Object / Container class metadata

## What is intentionally deferred

This handoff stops short of a full runtime migration. Specifically deferred:

- real render execution inside the Cloudflare Container
- signed progress/completion callbacks from render control back into the app
- artifact/object storage migration for uploads and completed renders
- Cloudflare-compatible Prisma/database connectivity hardening
- production observability dashboards / alert routing

Those are the correct **next** steps, but they are not required to land the deployment scaffold cleanly.

## Current adapter workaround

OpenNext currently rejects the repo's `proxy.ts` auth guard path with a `Node.js middleware is not currently supported` error during Cloudflare builds. The repo therefore keeps the auth gate in `src/middleware.ts` for the Cloudflare scaffold, even though Next.js 16 prefers `proxy.ts`. Revisit this once the adapter/runtime support catches up.
