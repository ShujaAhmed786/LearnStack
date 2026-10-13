# Stage 1: Build the React app
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN pnpm --filter @learnstack/shared build
RUN pnpm --filter @learnstack/web build

# Stage 2: Serve with nginx
FROM nginx:alpine AS production
# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# Copy nginx config for SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
# Run on port 8080 (non-privileged) but as root for simplicity
# (static file server, minimal attack surface)
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
