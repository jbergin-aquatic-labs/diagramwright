# syntax=docker/dockerfile:1

# ---- Build ----
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Runtime ----
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Headless networked service by default: sync bridge + Streamable HTTP MCP.
ENV MCP_TRANSPORT=http
ENV DIAGRAMWRIGHT_BRIDGE_PORT=4319
ENV MCP_HTTP_PORT=4320
ENV DIAGRAMWRIGHT_STATE_FILE=/data/diagram.json

COPY package.json package-lock.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build /app/dist ./dist

RUN mkdir -p /data && chown -R node:node /data
USER node

EXPOSE 4319 4320
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.DIAGRAMWRIGHT_BRIDGE_PORT||4319)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
