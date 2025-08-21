FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S musicplayer -u 1001

# Change ownership of the app directory
RUN chown -R musicplayer:nodejs /app
USER musicplayer

EXPOSE 3000

CMD ["node", "src/server.js"]
