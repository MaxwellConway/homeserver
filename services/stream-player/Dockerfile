# Multi-stage build for React client
FROM node:18-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --only=production
COPY client/ ./
RUN npm run build

# Production server
FROM node:18-alpine
WORKDIR /app

# Install ffmpeg for video metadata extraction
RUN apk add --no-cache ffmpeg

# Copy server package files
COPY package*.json ./
RUN npm install --only=production

# Copy server source
COPY src/ ./src/

# Copy built client files
COPY --from=client-build /app/client/build ./src/public

# Create data directory for SQLite database
RUN mkdir -p /data

EXPOSE 3000

CMD ["npm", "start"]
