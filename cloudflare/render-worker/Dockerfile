FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production     PORT=8080     RENDER_EXECUTION_MODE=cloudflare-container

RUN apt-get update && apt-get install -y --no-install-recommends     ffmpeg     curl     ca-certificates     && rm -rf /var/lib/apt/lists/*

COPY cloudflare/render-worker/container/server.mjs ./server.mjs

EXPOSE 8080

CMD ["node", "server.mjs"]
