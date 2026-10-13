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
# Fix for non-root: nginx needs writable pid file and directories
# Create nginx cache and run directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/run /var/log/nginx /tmp/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx /tmp/nginx && \
    chmod -R 755 /usr/share/nginx/html && \
    # Change pid file location to writable /tmp
    sed -i 's|pid /run/nginx.pid;|pid /tmp/nginx/nginx.pid;|' /etc/nginx/nginx.conf
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
