# NoLSAF Web App Dockerfile (Next.js)
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# Keep npm version consistent with the repo lockfile
RUN npm i -g npm@11.6.1

# Copy the monorepo (this Dockerfile is intended to be built with the nolsaf/ folder as the build context)
COPY . .

# Install only the web/shared workspaces needed for this image. Native-only
# workspaces stay in the repo but should not affect web deploys.
RUN npm ci --include-workspace-root --workspace=@nolsaf/web --workspace=@nolsaf/shared --workspace=@nolsaf/prisma

# Stage 2: Builder
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Keep npm version consistent with the repo lockfile
RUN npm i -g npm@11.6.1

# Prisma on slim images expects OpenSSL to be present
RUN apt-get update -y \
	&& apt-get install -y openssl \
	&& rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copy source code
COPY . .

# Generate Prisma client
WORKDIR /app
RUN npm run prisma:generate

# Build shared packages
RUN npm run --workspace=@nolsaf/shared build
RUN npm run --workspace=@nolsaf/prisma build

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=2048
WORKDIR /app/apps/web
RUN npm run build

# Stage 3: Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./.next/static

# Copy node_modules if needed for standalone
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/node_modules ./apps/web/node_modules

# Set correct permissions
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
