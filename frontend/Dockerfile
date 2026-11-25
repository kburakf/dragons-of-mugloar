# Stage 1: build the static files.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w frontend --include-workspace-root=false
COPY frontend frontend
# The browser calls this URL. Vite writes it into the files at build time.
ARG VITE_API_URL=http://localhost:3100/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w frontend

# Stage 2: serve the files with nginx. This image runs as a non-root user on port 8080.
FROM nginxinc/nginx-unprivileged:alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 8080
