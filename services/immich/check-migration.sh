#!/bin/bash
# Monitor Immich library migration to NAS

echo "Immich Library Migration Status"
echo "================================"
echo ""

# Check if rsync is still running
if pgrep -f "rsync.*immich/library" > /dev/null; then
    echo "Status: RUNNING"
    echo ""
    
    # Show current size on NAS
    NAS_SIZE=$(du -sh /mnt/media/Photos/Immich-Uploads 2>/dev/null | cut -f1)
    LOCAL_SIZE=$(du -sh /home/maxwell/homeserver/services/immich/library 2>/dev/null | cut -f1)
    
    echo "Source (local):      $LOCAL_SIZE"
    echo "Destination (NAS):   $NAS_SIZE"
    echo ""
    echo "Transfer in progress... Run this script again to check status."
else
    echo "Status: COMPLETE or NOT RUNNING"
    echo ""
    
    # Show final sizes
    NAS_SIZE=$(du -sh /mnt/media/Photos/Immich-Uploads 2>/dev/null | cut -f1)
    LOCAL_SIZE=$(du -sh /home/maxwell/homeserver/services/immich/library 2>/dev/null | cut -f1)
    
    echo "Source (local):      $LOCAL_SIZE"
    echo "Destination (NAS):   $NAS_SIZE"
    echo ""
    
    # Compare file counts
    LOCAL_COUNT=$(find /home/maxwell/homeserver/services/immich/library -type f 2>/dev/null | wc -l)
    NAS_COUNT=$(find /mnt/media/Photos/Immich-Uploads -type f 2>/dev/null | wc -l)
    
    echo "Files on local:      $LOCAL_COUNT"
    echo "Files on NAS:        $NAS_COUNT"
    echo ""
    
    if [ "$LOCAL_COUNT" -eq "$NAS_COUNT" ]; then
        echo "✅ File counts match! Migration appears successful."
        echo ""
        echo "Next steps:"
        echo "1. Restart Immich: cd /home/maxwell/homeserver/services/immich && docker compose down && docker compose up -d"
        echo "2. Verify photos are accessible in Immich web UI"
        echo "3. Delete local copy: rm -rf /home/maxwell/homeserver/services/immich/library"
    else
        echo "⚠️  File counts don't match. Check for errors."
    fi
fi
