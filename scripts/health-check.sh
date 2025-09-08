#!/bin/bash
# Health Check Script
# Monitors all services and reports status

set -e

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
check_service "gamernet"
check_service "elden-ring"
check_service "jellyfin"
check_service "music-player"
check_service "stream-player"
check_service "stemtool"
check_service "screengrab"

echo ""
echo "🌐 Endpoint Health:"
echo "-------------------"

# Check public endpoints (if domain is accessible)
if [ ! -z "$DOMAIN" ]; then
    check_endpoint "https://traefik.$DOMAIN" "Traefik Dashboard"
    check_endpoint "https://portainer.$DOMAIN" "Portainer"
    check_endpoint "https://maxconway.com" "Portfolio"
    check_endpoint "https://gamernet.$DOMAIN" "Gamernet"
    check_endpoint "https://eldenring.$DOMAIN" "Elden Ring"
    check_endpoint "https://media.$DOMAIN" "Jellyfin"
    check_endpoint "https://music.$DOMAIN" "Music Player"
    check_endpoint "https://stream.$DOMAIN" "Stream Player"
    check_endpoint "https://stemtool.maxconway.com" "Stemtool"
    check_endpoint "https://screengrab.$DOMAIN" "Screengrab"
fi

echo ""
echo "📊 Resource Usage:"
echo "------------------"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "💾 Disk Usage:"
echo "--------------"
df -h / | tail -1
docker system df

echo ""
echo "🔍 Recent Errors (last 10):"
echo "----------------------------"
docker logs traefik --since 24h 2>&1 | grep -i error | tail -10 || echo "No recent errors found"

echo ""
echo "Health check complete!"
