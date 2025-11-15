# nolsaf Monorepo

This is a pnpm workspaces monorepo containing:

- apps/api: Node.js + Express + TypeScript backend with Socket.io
- apps/web: Next.js + Tailwind frontend
- packages/prisma: Shared Prisma schema and generator
- packages/shared: Shared types, utilities, and constants

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+
- Docker (optional: for MySQL + Redis via docker-compose)

## Quick start

1. Copy env templates and adjust values:
   - nolsaf/.env
   - nolsaf/apps/api/.env
   - nolsaf/apps/web/.env.local

2. Install dependencies (workspace):

   pnpm install

3. Start databases (optional via Docker):

   docker compose up -d

4. Generate Prisma client and apply migrations (first time):

   pnpm -w --filter @nolsaf/prisma generate
   pnpm -w --filter @nolsaf/prisma migrate

5. Run dev servers in parallel:

   pnpm dev

- API: http://localhost:4000
- Web: http://localhost:3000

## Workspace scripts

- pnpm dev: Start API and Web in watch mode
- pnpm build: Build all packages and apps
- pnpm -w --filter <pkg> <script>: Run a script for a single package/app

## Notes

- Prisma schema lives in packages/prisma. API depends on @nolsaf/prisma and @prisma/client.
- Tailwind is configured for Next.js app directory structure.
- Redis and Cloudinary are optional; stubs are included.
