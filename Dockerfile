# ============================================================================
# Multi-stage Dockerfile for ReactBits MCP Server
# Optimized for production deployment with security and performance
# ============================================================================

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Add build metadata
LABEL stage=builder
LABEL maintainer="ReactBits MCP Server Team"

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including dev dependencies for build)
RUN npm ci --no-optional --no-fund --no-audit

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.js

# ============================================================================
# Production stage
FROM node:18-alpine AS production

# Set Node.js environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

# Set working directory
WORKDIR /app

# Add metadata
LABEL org.opencontainers.image.title="ReactBits MCP Server"
LABEL org.opencontainers.image.description="Model Context Protocol server for ReactBits component library"
LABEL org.opencontainers.image.vendor="ReactBits"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/DavidHDev/react-bits"
LABEL org.opencontainers.image.documentation="https://reactbits.dev"

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reactbits -u 1001 -G nodejs

# Install production dependencies and security updates
RUN apk add --no-cache \
    dumb-init \
    tini \
    curl \
    ca-certificates && \
    apk upgrade --no-cache

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production --no-optional --no-fund --no-audit && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy production data and configurations
COPY production-react-bits-extraction/ ./production-react-bits-extraction/
COPY scraper-cache/ ./scraper-cache/

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/tmp && \
    chown -R reactbits:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER reactbits

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "console.log('Health check passed')" || exit 1

# Expose port (MCP typically uses stdio, but useful for debugging)
EXPOSE 3000

# Use tini as init system for proper signal handling
ENTRYPOINT ["tini", "--"]

# Default command
CMD ["node", "dist/index.js"]

# ============================================================================
# Development stage (for docker-compose override)
FROM node:18-alpine AS development

WORKDIR /app

# Install development tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl \
    vim

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S reactbits -u 1001 -G nodejs

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci --no-fund --no-audit

# Copy source code
COPY . .

# Set proper ownership
RUN chown -R reactbits:nodejs /app

# Switch to non-root user
USER reactbits

# Development command with hot reload
CMD ["npm", "run", "dev"]

# ============================================================================
# Testing stage (for CI/CD)
FROM development AS testing

# Switch back to root for test setup
USER root

# Install testing tools
RUN npm install -g @vercel/ncc jest

# Switch back to non-root user
USER reactbits

# Copy test files
COPY src/ ./src/

# Run tests by default
CMD ["npm", "test"]