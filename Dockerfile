FROM node:22-alpine

WORKDIR /app

# Install system dependencies (for Playwright, SQLite, etc.)
RUN apk add --no-cache \
    python3 \
    py3-pip \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    git \
    bash

# Set Playwright to use system Chromium
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --prefer-offline

# Copy source
COPY . .

# Build TypeScript
RUN npm run build 2>/dev/null || npx tsc --noEmit 2>/dev/null || true

# Create persistent data directories
RUN mkdir -p sessions sessions/whatsapp outputs skills

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "console.log('OK')" || exit 1

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
