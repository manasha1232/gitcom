# Multi-stage Dockerfile for CommitFlow AI Platform
FROM node:20-alpine AS builder

WORKDIR /app

# Install git, openssl, and build dependencies for Alpine
RUN apk add --no-cache git python3 make g++ openssl libc6-compat

# Copy package descriptors
COPY server/package*.json ./server/
COPY client/package*.json ./client/
COPY server/prisma ./server/prisma/

# Install dependencies
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY server ./server
COPY client ./client

# Build server and client
RUN cd server && npm run prisma:generate && npm run build
RUN cd client && npm run build

# Production image
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for Alpine
RUN apk add --no-cache git openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

COPY --from=builder /app/server ./server
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000

CMD ["sh", "-c", "cd server && npm run prisma:push && npm start"]
