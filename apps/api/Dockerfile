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

# Stage 2: Production image (smaller, no dev deps)
FROM node:22-alpine AS production
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN corepack enable && pnpm install --frozen-lockfile --prod
# Copy only the built output from builder stage
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# C5: Copy Prisma schema and generate client in production stage
# (prisma CLI is dev-only, so we copy the generated client from builder)
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
# C6: Create uploads dir with correct permissions before switching user
RUN mkdir -p /app/uploads && chown -R node:node /app
# Run as non-root for security
USER node
EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
