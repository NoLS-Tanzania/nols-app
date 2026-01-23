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

# Install dependencies (uses package-lock.json)
RUN npm ci

# Generate Prisma client + build workspace packages + build the API
RUN npm run prisma:generate
RUN npm run --workspace=@nolsaf/shared build
RUN npm run --workspace=@nolsaf/prisma build
RUN npm run --workspace=@nolsaf/api build

# Fail fast if build output is missing (prevents runtime MODULE_NOT_FOUND)
RUN test -f /app/apps/api/dist/src/index.js

ENV NODE_ENV=production

EXPOSE 4000

WORKDIR /app/apps/api
CMD ["node", "dist/src/index.js"]
