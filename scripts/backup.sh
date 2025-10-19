#!/bin/bash
# Backup Script for Homeserver
# Creates backups of configurations and important data

set -e

BACKUP_DIR="/home/maxwell/homeserver-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/$DATE"

echo "💾 Starting homeserver backup..."

# Create backup directory
mkdir -p "$BACKUP_PATH"

echo "📁 Backing up configurations..."

# Backup main configuration files
cp -r /home/maxwell/homeserver/traefik "$BACKUP_PATH/"
cp -r /home/maxwell/homeserver/portainer "$BACKUP_PATH/"
cp /home/maxwell/homeserver/start.sh "$BACKUP_PATH/"
cp /home/maxwell/homeserver/update.sh "$BACKUP_PATH/"
cp /home/maxwell/homeserver/README.md "$BACKUP_PATH/"
cp /home/maxwell/homeserver/.gitignore "$BACKUP_PATH/"

# Backup service configurations (exclude node_modules and build artifacts)
mkdir -p "$BACKUP_PATH/services"
for service in /home/maxwell/homeserver/services/*/; do
    service_name=$(basename "$service")
    if [ "$service_name" != "template" ]; then
        echo "Backing up $service_name configuration..."
        mkdir -p "$BACKUP_PATH/services/$service_name"
        
        # Copy configuration files only
        find "$service" -maxdepth 1 -type f \( -name "*.yml" -o -name "*.yaml" -o -name "*.json" -o -name "Dockerfile" -o -name "*.conf" -o -name "*.md" \) -exec cp {} "$BACKUP_PATH/services/$service_name/" \;
        
        # Copy src directories if they exist
        if [ -d "$service/src" ]; then
            cp -r "$service/src" "$BACKUP_PATH/services/$service_name/"
        fi
    fi
done

echo "🗃️  Backing up Docker volumes..."

# Backup important Docker volumes
echo "Backing up Portainer data..."
docker run --rm -v portainer_data:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/portainer_data.tar.gz -C /data . 2>/dev/null || echo "⚠️  Portainer volume not found"

echo "Backing up Immich data..."
docker run --rm -v immich_pgdata:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/immich_pgdata.tar.gz -C /data . 2>/dev/null || echo "⚠️  Immich pgdata volume not found"
docker run --rm -v immich_model-cache:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/immich_model-cache.tar.gz -C /data . 2>/dev/null || echo "⚠️  Immich model-cache volume not found"

echo "Backing up media player data..."
docker run --rm -v music-player-data:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/music-player-data.tar.gz -C /data . 2>/dev/null || echo "⚠️  Music player volume not found"
docker run --rm -v stream-player-data:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/stream-player-data.tar.gz -C /data . 2>/dev/null || echo "⚠️  Stream player volume not found"
docker run --rm -v screengrab_screenshots:/data -v "$BACKUP_PATH":/backup alpine tar czf /backup/screengrab_screenshots.tar.gz -C /data . 2>/dev/null || echo "⚠️  Screengrab volume not found"

# Backup Jellyfin config if it exists
if [ -d "/home/maxwell/homeserver/services/jellyfin/config" ]; then
    echo "Backing up Jellyfin config..."
    tar czf "$BACKUP_PATH/jellyfin_config.tar.gz" -C /home/maxwell/homeserver/services/jellyfin config
fi

# Backup Immich library if it exists
if [ -d "/home/maxwell/homeserver/services/immich/library" ]; then
    echo "Backing up Immich library..."
    tar czf "$BACKUP_PATH/immich_library.tar.gz" -C /home/maxwell/homeserver/services/immich library
fi

echo "📋 Creating backup manifest..."

# Create backup manifest
cat > "$BACKUP_PATH/MANIFEST.txt" << EOF
Homeserver Backup - $DATE
=============================

Backup Contents:
- Traefik configuration
- Portainer configuration  
- Main scripts (start.sh, update.sh)
- Utility scripts (backup.sh, cleanup.sh, health-check.sh)
- Service configurations (docker-compose.yml files)
- Service source code (src directories)
- Docker volume data:
  * Portainer data
  * Immich database (PostgreSQL)
  * Immich ML model cache
  * Immich library uploads
  * Music player data
  * Stream player data
  * Screengrab screenshots
- Jellyfin configuration

NOTE: /mnt/media/Photos is NOT backed up (external NFS mount)

Backup Size: $(du -sh "$BACKUP_PATH" | cut -f1)
Created: $(date)

To restore:
1. Copy configurations back to homeserver directory
2. Restore Docker volumes using: docker run --rm -v volume_name:/data -v /path/to/backup:/backup alpine tar xzf /backup/volume_data.tar.gz -C /data
3. Run ./start.sh to bring services back online
EOF

# Compress the entire backup
echo "🗜️  Compressing backup..."
cd "$BACKUP_DIR"
tar czf "homeserver_backup_$DATE.tar.gz" "$DATE"
rm -rf "$DATE"

echo "✅ Backup complete!"
echo "📁 Backup saved to: $BACKUP_DIR/homeserver_backup_$DATE.tar.gz"
echo "📊 Backup size: $(du -sh "$BACKUP_DIR/homeserver_backup_$DATE.tar.gz" | cut -f1)"

# Clean up old backups (keep last 7 days)
echo "🧹 Cleaning up old backups..."
find "$BACKUP_DIR" -name "homeserver_backup_*.tar.gz" -mtime +7 -delete

echo "💾 Backup process completed successfully!"
