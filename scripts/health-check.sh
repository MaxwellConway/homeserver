#!/bin/bash
# Health Check Script
# Monitors all services and reports status

# Don't exit on errors - we want to see all status checks
set +e

echo "🏥 Homeserver Health Check"
echo "=========================="

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found!"
    exit 1
fi

# Function to check if a service is healthy
check_service() {
    local service_name="$1"
    local expected_status="$2"
    
    if docker ps --filter "name=$service_name" --filter "status=running" | grep -q "$service_name"; then
        echo "✅ $service_name: Running"
        return 0
    else
        echo "❌ $service_name: Not running"
        return 1
    fi
}

# Function to check HTTP endpoint
check_endpoint() {
    local url="$1"
    local service_name="$2"
    
    if curl -s -f -k "$url" > /dev/null 2>&1; then
        echo "✅ $service_name endpoint: Accessible"
        return 0
    else
        echo "❌ $service_name endpoint: Not accessible"
        return 1
    fi
}

echo ""
echo "🐳 Container Status:"
echo "-------------------"

# Check core services
check_service "traefik"
check_service "portainer"

# Check application services
check_service "maxconway-portfolio"
check_service "majorasmax-frontend"
check_service "stemtool"
check_service "screengrab"

# Check Immich services
check_service "immich_server"
check_service "immich_microservices"
check_service "immich_machine_learning"
check_service "immich_postgres"
check_service "immich_redis"

# Check media services
check_service "jellyfin"
check_service "music-player"
check_service "stream-player"

echo ""
echo "🌐 Endpoint Health:"
echo "-------------------"

# Check public endpoints (if domain is accessible)
if [ ! -z "$DOMAIN" ]; then
    echo "Core Infrastructure:"
    check_endpoint "https://traefik.$DOMAIN" "Traefik Dashboard"
    check_endpoint "https://portainer.$DOMAIN" "Portainer"
    
    echo ""
    echo "Web Applications:"
    check_endpoint "https://maxconway.com" "Portfolio"
    check_endpoint "https://majorasmax.com" "Majorasmax Frontend"
    check_endpoint "https://gamernet.$DOMAIN" "Gamernet"
    check_endpoint "https://eldenring.maxconway.com" "Elden Ring"
    check_endpoint "https://stemtool.maxconway.com" "Stemtool"
    check_endpoint "https://screengrab.$DOMAIN" "Screengrab"
    
    echo ""
    echo "Media Services:"
    check_endpoint "https://photos.maxconway.com" "Immich Photos"
    check_endpoint "https://media.$DOMAIN" "Jellyfin"
    check_endpoint "https://music.$DOMAIN" "Music Player"
    check_endpoint "https://stream.$DOMAIN" "Stream Player"
fi

echo ""
echo "📊 Resource Usage:"
echo "------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "💾 Disk Usage:"
echo "--------------"

# Get disk usage percentage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')

# Display disk info
df -h / | tail -1

# Alert if disk usage is high
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "🔴 CRITICAL: Disk usage at ${DISK_USAGE}% - immediate action required!"
elif [ "$DISK_USAGE" -gt 75 ]; then
    echo "⚠️  WARNING: Disk usage at ${DISK_USAGE}% - consider cleanup soon"
elif [ "$DISK_USAGE" -gt 60 ]; then
    echo "⚡ NOTICE: Disk usage at ${DISK_USAGE}% - monitor closely"
else
    echo "✅ Disk usage healthy at ${DISK_USAGE}%"
fi

echo ""
docker system df

echo ""
echo "🔍 Recent Errors (last 10):"
echo "----------------------------"
docker logs traefik --since 24h 2>&1 | grep -i error | tail -10 || echo "No recent errors found"

echo ""
echo "Health check complete!"
