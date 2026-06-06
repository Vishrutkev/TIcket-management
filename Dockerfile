# syntax=docker/dockerfile:1

# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace manifests first — layer-cache friendly
COPY package.json package-lock.json ./
COPY core/package.json          ./core/
COPY client/package.json        ./client/
COPY server/package.json        ./server/

RUN npm ci

# Copy all source
COPY core/   ./core/
COPY client/ ./client/
COPY server/ ./server/

# Build client (Vite, reads client/.env.production → VITE_API_URL='')
# Build server (prisma generate + tsc → server/dist/)
RUN npm run build --workspace=client && \
    npm run build --workspace=server

# ─── Stage 2: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Package manifests needed for workspace resolution
COPY package.json ./
COPY core/package.json   ./core/
COPY server/package.json ./server/

# Carry over the full node_modules from the builder.
# This includes the prisma CLI (devDep) which is required for
# `prisma migrate deploy` at container startup.
COPY --from=builder /app/node_modules ./node_modules

# core source — @tm/core symlink in node_modules points here at runtime
COPY --from=builder /app/core ./core

# Server compiled output
COPY --from=builder /app/server/dist ./server/dist

# React SPA — served as static files by Express in production
COPY --from=builder /app/client/dist ./client/dist

# Prisma schema + migration files needed by migrate deploy
COPY server/prisma ./server/prisma

EXPOSE 3000

# 1. Run any pending migrations against the production DB
# 2. Start the server (which also serves the client SPA)
CMD ["sh", "-c", \
  "node_modules/.bin/prisma migrate deploy --schema=server/prisma/schema.prisma && \
   node server/dist/index.js"]
