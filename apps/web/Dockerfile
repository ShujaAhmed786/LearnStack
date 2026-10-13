# Stage 1: Build the React app
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
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
# Run as non-root for security
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/run /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html
USER nginx
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
