# syntax=docker/dockerfile:1

# ---- Dependencies ----
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `npm install` (not `ci`) so platform-specific optional native deps resolve
# for the image's OS/arch even if the committed lockfile was built elsewhere.
RUN npm install --no-audit --no-fund

# ---- Build ----
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Browser-side bridge URL is baked at build time (NEXT_PUBLIC_*). Override for
# remote deployments, e.g. --build-arg NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL=http://host:4319
ARG NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL=http://localhost:4319
ENV NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL=$NEXT_PUBLIC_DIAGRAMWRIGHT_BRIDGE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime ----
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
