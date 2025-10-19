#!/bin/bash
# Simple Homeserver Startup Script
set -e

echo "🚀 Starting Simple Homeserver..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Create Docker network if it doesn't exist
echo "📡 Creating network: $TRAEFIK_PUBLIC_NETWORK"
docker network create $TRAEFIK_PUBLIC_NETWORK 2>/dev/null || echo "Network already exists"

# Create letsencrypt directory
mkdir -p traefik/letsencrypt

# Start Traefik
echo "🔀 Starting Traefik (reverse proxy)..."
cd traefik
docker compose up -d
cd ..

# Wait for Traefik to be ready
echo "⏳ Waiting for Traefik to start..."
sleep 5

# Start Portainer
echo "🐳 Starting Portainer (container management)..."
cd portainer
docker compose up -d
cd ..

echo ""
echo "✅ Core infrastructure started successfully!"
echo ""
echo "🌐 Core services:"
echo "   Traefik Dashboard: https://traefik.$DOMAIN (requires authentication)"
echo "   Portainer:         https://portainer.$DOMAIN"
echo ""
echo "📊 Container status:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
echo ""
echo "💡 Next steps:"
echo "   - Individual services must be started from their directories"
echo "   - Or use ./update.sh to update and start all services"
echo "   - Run ./scripts/health-check.sh to monitor all services"
echo "   - Wait 2-3 minutes for SSL certificates to generate"
echo "   - Check logs with: docker logs <container-name>"
