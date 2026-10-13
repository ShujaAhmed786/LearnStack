# Stage 1: Build the API
FROM node:22-alpine AS builder
WORKDIR /app
# Copy workspace config first for better layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
# Install all dependencies (including dev)
RUN corepack enable && pnpm install --frozen-lockfile
# Copy source code
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY apps/api ./apps/api
# Build shared package then API
RUN pnpm --filter @learnstack/shared build
RUN DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy pnpm --filter db build
RUN pnpm --filter @learnstack/api build

# Stage 2: Production image
FROM node:22-alpine AS production
WORKDIR /app
# C5: Copy everything from builder including node_modules with generated Prisma Client
# (simpler and more reliable than trying to reconstruct the Prisma client)
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/packages/db ./packages/db
COPY --from=builder /app/apps/api ./apps/api
# C6: Create uploads dir with correct permissions before switching user
RUN mkdir -p /app/uploads && chown -R node:node /app
# Run as non-root for security
USER node
EXPOSE 3001
# Run Prisma migrations on startup, then start the app
# (migrations are idempotent - safe to run on every startup)
CMD ["sh", "-c", "npx prisma migrate deploy --schema=/app/packages/db/prisma/schema.prisma && node apps/api/dist/index.js"]
