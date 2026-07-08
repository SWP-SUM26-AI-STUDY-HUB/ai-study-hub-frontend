# --- build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest (respect .dockerignore: no node_modules/dist/.git/local .env)
COPY . .

# Vite bakes VITE_API_BASE_URL into the bundle at build time. In production the
# SPA is served behind an nginx reverse proxy (same origin), so the value is
# empty (relative "/api/v1/...") — see .env.production.
RUN npm run build

# --- serve stage -------------------------------------------------------------
FROM nginx:1.27-alpine AS serve

# nginx:alpine runs envsubst over /etc/nginx/templates/*.template at startup,
# substituting only defined env vars (nginx's own $host/$remote_addr are left
# intact). We template the upstream backend URL so the proxy target is driven by
# the BACKEND_API_URL env var (docker network DNS by default).
COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY --from=build /app/dist /usr/share/nginx/html

ENV BACKEND_API_URL=http://ai-study-hub-api:8080

EXPOSE 80
