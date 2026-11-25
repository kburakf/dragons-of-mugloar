# Stage 1: install all dependencies and build.
FROM node:24-alpine AS build
WORKDIR /app
# Copy the manifests first, so Docker caches the install step.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend --include-workspace-root=false
COPY backend backend
RUN npm run build -w backend

# Stage 2: install only the production dependencies.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend --omit=dev --include-workspace-root=false

# Stage 3: slim runtime image.
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY --from=build /app/backend/dist backend/dist
COPY backend/package.json backend/
USER node
EXPOSE 3100
CMD ["node", "backend/dist/main.js"]
