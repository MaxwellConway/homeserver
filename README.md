# Simple Homeserver

A clean, simple homeserver setup for hosting personal projects and services.

## Quick Start

```bash
# Start everything
./start.sh

# Access your services
# Traefik Dashboard: https://traefik.maxconway.com (admin/admin123)
# Portainer: https://portainer.maxconway.com
```

## What's Running

- **Traefik**: Reverse proxy with automatic SSL certificates
- **Portainer**: Web UI for managing containers

## Adding New Services

1. Copy the template:
```bash
cp -r services/template services/my-new-service
cd services/my-new-service
```

2. Edit `docker-compose.yml`:
   - Change service name and image
   - Update the domain (my-service → my-new-service)
   - Adjust port if needed

3. Start it:
```bash
docker compose up -d
```

4. Access at: `https://my-new-service.maxconway.com`

## Directory Structure

```
homeserver/
├── .env                    # Configuration
├── start.sh              # Startup script
├── traefik/              # Reverse proxy
├── portainer/            # Container management
└── services/
    └── template/         # Template for new services
```

## Troubleshooting

- **Service not accessible?** Wait 2-3 minutes for SSL certificates
- **Check container status:** `docker ps`
- **View logs:** `docker logs <container-name>`
- **Restart everything:** Run `./start.sh` again
