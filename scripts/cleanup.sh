#!/bin/bash
# Docker Cleanup Script
# Removes unused images, containers, networks, and volumes

set -e

echo "🧹 Starting Docker cleanup..."

# Show current disk usage
echo "📊 Current Docker disk usage:"
docker system df

echo ""
echo "🗑️  Cleaning up unused resources..."

# Remove stopped containers
echo "Removing stopped containers..."
docker container prune -f

# Remove unused networks
echo "Removing unused networks..."
docker network prune -f

# Remove unused volumes (be careful with this)
echo "Removing unused volumes..."
docker volume prune -f

# Remove unused images
echo "Removing unused images..."
docker image prune -f

# Remove dangling images
echo "Removing dangling images..."
docker image prune -a -f --filter "dangling=true"

# Remove build cache
echo "Removing build cache..."
docker builder prune -f

echo ""
echo "📊 Disk usage after cleanup:"
docker system df

echo ""
echo "✅ Cleanup complete!"
