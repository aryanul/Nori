# Hocuspocus sync server — runs `tsx server/hocuspocus.ts` in production.
# Built for Fly.io but works on any container host.

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
# Fly injects PORT; map it to HOCUSPOCUS_PORT inside the container.
ENV HOCUSPOCUS_PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "server/hocuspocus.ts"]
