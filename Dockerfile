FROM node:22-bookworm-slim AS base
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

FROM base AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=8088 \
    UPLOAD_DIR=/data/uploads \
    COVER_DIR=/data/covers \
    DATABASE_URL=file:/data/app.db

RUN mkdir -p /data/uploads /data/covers \
    && chown -R node:node /data

COPY --from=builder --chown=node:node /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/packages/html-publish-cli ./packages/html-publish-cli
COPY --from=builder --chown=node:node /app/next.config.js ./next.config.js

USER node
EXPOSE 8088
CMD ["sh", "-c", "npx prisma migrate deploy && npm start -- -p 8088"]
