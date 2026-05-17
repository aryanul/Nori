# Hocuspocus sync server — runs `tsx server/hocuspocus.ts` in production.
# Designed for Render (web service, docker runtime), but works on any host
# that injects PORT.

FROM node:20-alpine AS base
WORKDIR /app

# Install deps first so we cache them across code changes.
COPY package.json package-lock.json ./
RUN npm ci --omit=optional

# Copy only what the Hocuspocus process needs at runtime: the TS source
# under src/, the entrypoint under server/, and the tsconfig (tsx reads
# its `paths` to resolve the `@/lib/...` imports).
COPY tsconfig.json ./
COPY server ./server
COPY src ./src

ENV NODE_ENV=production
# Render assigns PORT at runtime; the server reads $PORT first.
EXPOSE 10000

CMD ["npx", "tsx", "server/hocuspocus.ts"]
