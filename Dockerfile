# Multi-stage build for Copilot MCP Toolset
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build:prod

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S copilotmcp -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=copilotmcp:nodejs /app/dist ./dist

# Create storage directory
RUN mkdir -p /app/storage && chown copilotmcp:nodejs /app/storage

# Switch to non-root user
USER copilotmcp

# Expose port (if needed for HTTP mode)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Default command
CMD ["node", "dist/server/index.js"]

# Labels
LABEL org.opencontainers.image.title="Copilot MCP Toolset"
LABEL org.opencontainers.image.description="A comprehensive Model Context Protocol toolset for GitHub Copilot"
LABEL org.opencontainers.image.vendor="Copilot MCP Team"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/yourusername/copilot-mcp-toolset"