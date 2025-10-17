# Multi-stage build for ShirinQ Connect
FROM node:18-alpine AS base

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm run install-all

# Build stage
FROM base AS build

# Copy source code
COPY . .

# Build client
WORKDIR /app/client
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install MongoDB tools for health checks
RUN apk add --no-cache mongodb-tools

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S shirinq -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=shirinq:nodejs /app/server ./server
COPY --from=build --chown=shirinq:nodejs /app/client/build ./client/build
COPY --from=build --chown=shirinq:nodejs /app/package*.json ./

# Install production dependencies only
WORKDIR /app/server
RUN npm ci --only=production && npm cache clean --force

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R shirinq:nodejs /app/uploads

# Switch to non-root user
USER shirinq

# Expose ports
EXPOSE 5000 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["npm", "start"]
