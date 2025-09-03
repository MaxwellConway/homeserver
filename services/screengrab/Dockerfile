FROM node:18-alpine

# Install ffmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY src/ ./src/
COPY public/ ./public/

# Create screenshots directory
RUN mkdir -p /tmp/screenshots

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
