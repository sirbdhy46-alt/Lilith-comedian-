FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    python3 \
    make \
    g++ \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY bot/lilithai/package.json ./bot/lilithai/

RUN pnpm install --filter @workspace/lilithai-bot... --frozen-lockfile

COPY bot/lilithai ./bot/lilithai

WORKDIR /app/bot/lilithai

ENV NODE_ENV=production
CMD ["pnpm", "start"]
