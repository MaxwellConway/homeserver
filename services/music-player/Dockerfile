# Multi-stage build for React app
FROM node:18-alpine AS client-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm install

# Copy client source code
COPY client/ ./

# Build React app
RUN npm run build

# Production stage
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install SQLite3 build dependencies for Alpine
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy server source code
COPY src/ ./src/

# Copy built React app from client-build stage
COPY --from=client-build /app/client/build ./src/public

# Create data directory for database
RUN mkdir -p /data && \
    addgroup -g 1001 -S nodejs && \
    adduser -S musicplayer -u 1001

# Change ownership of directories
RUN chown -R musicplayer:nodejs /app /data

# Switch to non-root user
USER musicplayer

# Create volume for persistent database storage
VOLUME ["/data"]

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
