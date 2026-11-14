# Production Dockerfile for Render / Cloud Deployment
FROM node:20-bookworm-slim

# Install system FFmpeg with HarfBuzz support and Noto fonts for Hindi Devanagari text shaping
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libharfbuzz-bin \
    fonts-noto-core \
    fonts-freefont-ttf \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root and package manifests for clean layer caching
COPY package.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install backend and frontend dependencies
RUN npm --prefix backend install --ignore-scripts
RUN npm --prefix frontend install

# Copy source code
COPY backend ./backend
COPY frontend ./frontend

# Build frontend production bundle
RUN npm --prefix frontend run build

# Create necessary temporary storage directories
RUN mkdir -p backend/temp/uploads backend/temp/exports

# Default environment
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "backend/src/server.js"]
