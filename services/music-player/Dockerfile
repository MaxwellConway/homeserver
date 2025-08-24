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
FROM node:18-alpine AS production

WORKDIR /app

# Copy server package files
COPY package*.json ./

# Install server dependencies
RUN npm install --only=production

# Copy server source code
COPY src/ ./src/

# Copy built React app from client-build stage
COPY --from=client-build /app/client/build ./src/public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S musicplayer -u 1001

# Change ownership of the app directory
RUN chown -R musicplayer:nodejs /app
USER musicplayer

EXPOSE 3000

CMD ["node", "src/server.js"]
