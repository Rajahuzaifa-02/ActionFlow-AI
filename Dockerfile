# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy and install web dependencies
COPY web/package*.json ./web/
RUN cd web && npm install

# Copy and build web app
COPY web/ ./web/
RUN cd web && npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy server
COPY server/package*.json ./
RUN npm install --production

COPY server/ ./

# Copy built web assets
COPY --from=builder /app/web/dist ./public

# Serve static files from Express
RUN echo 'import express from "express"; import path from "path"; const app = express();' > serve-static.js

ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["node", "index.js"]
