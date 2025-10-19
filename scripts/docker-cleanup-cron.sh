#!/bin/bash
# Automated Docker Cleanup Script
# Runs weekly to remove unused Docker resources

LOG_FILE="/home/maxwell/homeserver/logs/docker-cleanup.log"

# Create logs directory if it doesn't exist
mkdir -p /home/maxwell/homeserver/logs

echo "=== Docker Cleanup - $(date) ===" >> "$LOG_FILE" 2>&1

# Navigate to homeserver directory
cd /home/maxwell/homeserver

# Remove unused Docker resources
docker system prune -af --volumes >> "$LOG_FILE" 2>&1

# Log disk usage after cleanup
echo "Disk usage after cleanup:" >> "$LOG_FILE" 2>&1
df -h / | tail -1 >> "$LOG_FILE" 2>&1

echo "=== Cleanup Complete ===" >> "$LOG_FILE" 2>&1
echo "" >> "$LOG_FILE" 2>&1
