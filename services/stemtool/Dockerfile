# Multi-stage build for React app with Python dependencies
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --only=production
COPY client/ ./
RUN npm run build

FROM python:3.10-slim AS final

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install yt-dlp
RUN pip install yt-dlp

# Install Demucs with soundfile for audio backend support
RUN pip install demucs soundfile

# Set working directory
WORKDIR /app

# Copy package files and install Node.js dependencies
COPY package*.json ./
RUN npm install --only=production

# Copy server source
COPY src/ ./src/

# Copy built React app from client-build stage
COPY --from=client-build /app/client/build ./client/build

# Create data directory for processing files
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
