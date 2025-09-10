#!/bin/bash

echo "Restarting stemtool and eldenring services for subdomain routing..."

# Navigate to stemtool service and restart
cd /home/maxwell/homeserver/services/stemtool
echo "Restarting stemtool service..."
docker-compose down
docker-compose up -d

# Navigate to elden-ring service and restart  
cd /home/maxwell/homeserver/services/elden-ring
echo "Restarting elden-ring service..."
docker-compose down
docker-compose up -d

echo "Services restarted. Check the following URLs:"
echo "- https://stemtool.majorasmax.com"
echo "- https://eldenring.majorasmax.com"
echo ""
echo "If you encounter SSL issues, wait a few minutes for Let's Encrypt certificates to be issued."
