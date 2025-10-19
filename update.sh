#!/bin/bash
# Comprehensive Homeserver Update Script
# Updates all containers, rebuilds with no cache, and syncs code
set -e

echo "🔄 Starting Homeserver Update Process..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Function to update a service
update_service() {
    local service_dir="$1"
    local service_name=$(basename "$service_dir")
    
    if [ -f "$service_dir/docker-compose.yml" ]; then
        echo "🔄 Updating $service_name..."
        cd "$service_dir"
        
        # Stop the service
        docker compose down
        
        # Remove old images to force rebuild
        docker compose build --no-cache --pull
        
        # Start the service
        docker compose up -d
        
        cd - > /dev/null
        echo "✅ $service_name updated successfully"
    else
        echo "⚠️  No docker-compose.yml found in $service_dir"
    fi
}

# Function to check if service is healthy
check_service_health() {
    local container_name="$1"
    local max_attempts=30
    local attempt=1
    
    echo "🏥 Checking health of $container_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if docker ps --filter "name=$container_name" --filter "status=running" | grep -q "$container_name"; then
            echo "✅ $container_name is running"
            return 0
        fi
        
        echo "⏳ Waiting for $container_name to start (attempt $attempt/$max_attempts)..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $container_name failed to start properly"
    return 1
}

# Update core infrastructure first
echo ""
echo "🏗️  Updating Core Infrastructure..."

# Update Traefik
echo "🔀 Updating Traefik..."
cd traefik
docker compose pull
docker compose up -d --force-recreate
cd ..

# Wait for Traefik to be ready
sleep 5
check_service_health "traefik"

# Update Portainer
echo "🐳 Updating Portainer..."
cd portainer
docker compose pull
docker compose up -d --force-recreate
cd ..

check_service_health "portainer"

# Update all services
echo ""
echo "🚀 Updating All Services..."

# Find all service directories
for service_dir in services/*/; do
    if [ -d "$service_dir" ]; then
        update_service "$service_dir"
    fi
done

# Clean up unused Docker resources
echo ""
echo "🧹 Cleaning up unused Docker resources..."
docker system prune -f
docker image prune -f

# Show final status
echo ""
echo "📊 Final Container Status:"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🎉 Homeserver Update Complete!"
echo ""
echo "🌐 Your updated services:"
echo "   Core Infrastructure:"
echo "     - Traefik Dashboard: https://traefik.$DOMAIN"
echo "     - Portainer:         https://portainer.$DOMAIN"
echo ""
echo "   Web Applications:"
echo "     - Portfolio:         https://maxconway.com"
echo "     - Majorasmax:        https://majorasmax.com"
echo "     - Gamernet:          https://gamernet.$DOMAIN"
echo "     - Elden Ring:        https://eldenring.majorasmax.com | https://eldenring.maxconway.com"
echo "     - Stemtool:          https://stemtool.majorasmax.com | https://stemtool.maxconway.com"
echo "     - Screengrab:        https://screengrab.$DOMAIN"
echo ""
echo "   Media Services:"
echo "     - Immich Photos:     https://photos.maxconway.com"
echo "     - Jellyfin:          https://media.$DOMAIN"
echo "     - Music Player:      https://music.$DOMAIN"
echo "     - Stream Player:     https://stream.$DOMAIN"
echo ""
echo "💡 Tips:"
echo "   - All containers have been rebuilt with latest code"
echo "   - SSL certificates will auto-renew if needed"
echo "   - Run ./scripts/health-check.sh to verify all services"
echo "   - Check logs with: docker logs <container-name>"
echo "   - Monitor with: docker stats"
