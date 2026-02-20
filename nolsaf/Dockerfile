# NoLSAF API Dockerfile (for Render)
# Builds the monorepo workspaces needed by the API and runs the API server.

FROM node:20-bookworm-slim

# Keep npm version consistent with the repo lockfile
RUN npm i -g npm@11.6.1

# Prisma on slim images expects OpenSSL to be present
RUN apt-get update -y \
	&& apt-get install -y openssl \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the monorepo (Render will build from the repo root you select)
COPY . .

# Install + build from the monorepo root.
# This Dockerfile may be used with either build context:
# - context = nolsaf/ (recommended) => lockfile at /app/package-lock.json
# - context = repo root            => lockfile at /app/nolsaf/package-lock.json
RUN set -eu; \
	if [ -f /app/package-lock.json ]; then ROOT=/app; \
	elif [ -f /app/nolsaf/package-lock.json ]; then ROOT=/app/nolsaf; \
	else echo "package-lock.json not found in /app or /app/nolsaf"; ls -la /app; exit 1; fi; \
	cd "$ROOT"; \
	npm ci; \
	npm run prisma:generate; \
	npm run --workspace=@nolsaf/shared build; \
	npm run --workspace=@nolsaf/prisma build; \
	npm run --workspace=@nolsaf/api build; \
	test -f "$ROOT/apps/api/dist/src/index.js"

ENV NODE_ENV=production

EXPOSE 4000

# Start the API from the correct working directory so relative paths behave.
# The API is compiled to ESM and many local imports are extensionless (e.g. ./env).
# This flag makes Node resolve those like CommonJS-style (./env -> ./env.js).
CMD ["sh", "-lc", "if [ -d /app/apps/api ]; then cd /app/apps/api; else cd /app/nolsaf/apps/api; fi; node --experimental-specifier-resolution=node dist/src/index.js"]
