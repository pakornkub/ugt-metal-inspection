FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
ARG BACKEND_URL=http://backend:3101
# NEXT_PUBLIC_* is inlined into the client bundle at compile time — must
# arrive as --build-arg from the Jenkinsfile; setting it in compose
# `environment:` at runtime has no effect on already-built pages.
ARG NEXT_PUBLIC_BASE_PATH=""
ARG NEXT_PUBLIC_APP_URL=""
ENV BACKEND_URL=$BACKEND_URL \
    NEXT_PUBLIC_BASE_PATH=$NEXT_PUBLIC_BASE_PATH \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3100
# Path is hardcoded to the prod basePath — env var substitution does not work
# in HEALTHCHECK. docker-compose.dev.yml's own healthcheck: overrides this
# with the dev basePath when run via compose (which is always, in practice).
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3100/ugt-metal-inspection/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
