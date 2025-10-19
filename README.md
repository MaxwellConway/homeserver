# Maxwell's Homeserver

A comprehensive homeserver setup hosting personal projects, media services, and web applications with automatic SSL certificates via Traefik.

## Quick Start

```bash
# Start core infrastructure (Traefik + Portainer)
./start.sh

# Update all services with latest code
./update.sh

# Run health checks
./scripts/health-check.sh
```

## Active Services

### Core Infrastructure
- **Traefik** (v3.0): Reverse proxy with automatic SSL via Let's Encrypt
  - Dashboard: https://traefik.maxconway.com (requires authentication)
  - DNS challenge for Cloudflare-proxied domains
- **Portainer** (CE): Container management UI
  - URL: https://portainer.maxconway.com

### Web Applications
- **Portfolio**: Personal portfolio website
  - URL: https://maxconway.com
  - Static site with project showcase
- **Majorasmax Frontend**: Service directory landing page
  - URL: https://majorasmax.com
  - Links to stemtool and elden-ring services
- **Gamernet**: Gaming network service
  - URL: https://gamernet.maxconway.com
- **Elden Ring**: Elden Ring related service
  - URLs: https://eldenring.majorasmax.com, https://eldenring.maxconway.com
- **Stemtool**: Audio stem separation tool
  - URLs: https://stemtool.majorasmax.com, https://stemtool.maxconway.com
  - Session-based isolation with automatic cleanup
- **Screengrab**: Screenshot generation service
  - URL: https://screengrab.maxconway.com

### Media Services
- **Immich**: Photo management and AI-powered organization
  - URL: https://photos.maxconway.com
  - External library: /mnt/media/Photos (read-only)
  - Features: Face detection, object recognition, smart search
- **Jellyfin**: Media server for movies and TV shows
  - URL: https://media.maxconway.com
  - NFS mounts: /mnt/media/*
- **Music Player**: Music streaming service
  - URL: https://music.maxconway.com
- **Stream Player**: Video streaming service
  - URL: https://stream.maxconway.com

## Management Scripts

### Main Scripts
- **start.sh**: Start core infrastructure (Traefik + Portainer)
- **update.sh**: Update all services with no-cache rebuild

### Utility Scripts (./scripts/)
- **health-check.sh**: Monitor all services and report status
- **backup.sh**: Backup configurations and Docker volumes
- **cleanup.sh**: Remove unused Docker resources

## Adding New Services

1. Copy the template:
```bash
cp -r services/template services/my-new-service
cd services/my-new-service
```

2. Edit `docker-compose.yml`:
   - Change service name and image
   - Update domain in Traefik labels
   - Configure ports and volumes
   - Use `letsencrypt-dns` resolver for SSL

3. Start the service:
```bash
docker compose up -d
```

4. Verify it's running:
```bash
docker ps | grep my-new-service
docker logs my-new-service
```

## Directory Structure

```
homeserver/
├── .env                    # Environment configuration (gitignored)
├── .env.example           # Template for environment variables
├── start.sh               # Core infrastructure startup
├── update.sh              # Comprehensive update script
├── traefik/               # Reverse proxy configuration
│   ├── traefik.yml       # Main Traefik config
│   ├── docker-compose.yml
│   └── letsencrypt/      # SSL certificates
├── portainer/             # Container management
├── scripts/               # Utility scripts
│   ├── backup.sh         # Backup automation
│   ├── cleanup.sh        # Docker cleanup
│   └── health-check.sh   # Service monitoring
└── services/              # Individual service deployments
    ├── immich/           # Photo management
    ├── portfolio/        # Personal website
    ├── majorasmax-frontend/  # Service directory
    ├── gamernet/         # Gaming service
    ├── elden-ring/       # Elden Ring service
    ├── stemtool/         # Audio processing
    ├── jellyfin/         # Media server
    ├── music-player/     # Music streaming
    ├── stream-player/    # Video streaming
    ├── screengrab/       # Screenshot service
    └── template/         # Template for new services
```

## Configuration

### Environment Variables (.env)
Copy `.env.example` to `.env` and configure:
- `DOMAIN`: Primary domain (maxconway.com)
- `EMAIL`: Email for Let's Encrypt notifications
- `TRAEFIK_PUBLIC_NETWORK`: Docker network name (web)
- `TRAEFIK_BASIC_AUTH`: Traefik dashboard credentials
- `CLOUDFLARE_EMAIL`: Cloudflare account email
- `CLOUDFLARE_API_KEY`: Cloudflare API key for DNS challenge

### SSL Certificates
- **HTTP Challenge**: For non-Cloudflare domains
- **DNS Challenge**: For Cloudflare-proxied domains (photos, stemtool, etc.)
- Certificates stored in `traefik/letsencrypt/acme.json`
- Auto-renewal handled by Traefik

## Troubleshooting

### Service Not Accessible
- Wait 2-3 minutes for SSL certificates to generate
- Check DNS records point to your server
- Verify Traefik routing: `docker logs traefik | grep -i error`

### Container Issues
```bash
# Check status
docker ps

# View logs
docker logs <container-name> --tail 50

# Restart service
cd services/<service-name>
docker compose restart

# Rebuild service
docker compose down
docker compose up -d --build
```

### SSL Certificate Issues
```bash
# Check certificate status
docker exec traefik ls -la /letsencrypt/

# View Traefik logs for ACME errors
docker logs traefik | grep -i acme

# For DNS challenge issues, verify Cloudflare credentials
docker exec traefik env | grep CF_
```

### Resource Issues
```bash
# Check resource usage
docker stats

# Clean up unused resources
./scripts/cleanup.sh

# Check disk space
df -h
docker system df
```

## Maintenance

### Regular Tasks
- **Daily**: Monitor service health with `./scripts/health-check.sh`
- **Weekly**: Update services with `./update.sh`
- **Weekly**: Clean up resources with `./scripts/cleanup.sh`
- **Monthly**: Run backups with `./scripts/backup.sh`
- **Monthly**: Review logs for errors and security issues

### Backup Strategy
- Configuration files tracked in Git
- Docker volumes backed up via `./scripts/backup.sh`
- Media files on NFS (backed up separately)
- Immich photos on /mnt/media/Photos (read-only mount)

## Security Notes

- Traefik dashboard protected with basic authentication
- All services use HTTPS with automatic SSL certificates
- Environment variables stored in gitignored `.env` file
- Docker socket mounted read-only where possible
- Regular security updates via `./update.sh`

For detailed security information, see `SECURITY_AUDIT.md`
