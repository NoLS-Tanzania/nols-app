# NoLSAF API Dockerfile (for Render)
# Builds the monorepo workspaces needed by the API and runs the API server.

FROM node:20-bookworm-slim

WORKDIR /app

# Copy the monorepo (Render will build from the repo root you select)
COPY . .

# Install dependencies (uses the root package-lock.json)
RUN npm ci

# Generate Prisma client + build workspace packages + build the API
RUN npm run prisma:generate
RUN npm run --workspace=@nolsaf/shared build
RUN npm run --workspace=@nolsaf/prisma build
RUN npm run --workspace=@nolsaf/api build

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
