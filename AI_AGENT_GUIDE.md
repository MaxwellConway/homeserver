# AI Agent Guide for Homeserver Management

## 🤖 Quick Start for AI Agents

This guide helps AI agents understand and work with the homeserver codebase efficiently.

### Directory Structure Overview
```
homeserver/
├── .env                    # Environment variables (gitignored)
├── .env.example           # Template for environment configuration
├── start.sh               # Main startup script (core infrastructure)
├── update.sh              # Comprehensive update script
├── traefik/               # Reverse proxy configuration
│   ├── traefik.yml       # Main Traefik config
│   ├── docker-compose.yml
│   └── letsencrypt/      # SSL certificates
├── portainer/             # Container management UI
├── scripts/               # Utility scripts
│   ├── backup.sh         # Backup automation
│   ├── cleanup.sh        # Docker cleanup
│   └── health-check.sh   # Service monitoring
└── services/              # Individual service deployments
    ├── template/          # Service template for new deployments
    ├── immich/            # Photo management with AI features
    ├── portfolio/         # Personal portfolio website (maxconway.com)
    ├── majorasmax-frontend/ # Service directory (majorasmax.com)
    ├── gamernet/          # Gaming network service
    ├── elden-ring/        # Elden Ring related service
    ├── jellyfin/          # Media server
    ├── music-player/      # Music streaming service
    ├── stream-player/     # Video streaming service
    ├── stemtool/          # Audio stem separation tool
    └── screengrab/        # Screenshot generation service
```

## 🔧 Common Tasks & Commands

### Service Management
```bash
# Start all services
./start.sh

# Update all services (rebuild with no cache)
./update.sh

# Check service status
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# View service logs
docker logs <service-name> --tail 50

# Restart specific service
cd services/<service-name>
docker compose down && docker compose up -d
```

### Adding New Services
1. Copy template: `cp -r services/template services/new-service`
2. Edit `docker-compose.yml` in new service directory
3. Update service name, image, and domain
4. Run: `cd services/new-service && docker compose up -d`

### Environment Variables
- `.env` file contains sensitive configuration (gitignored)
- Common variables: `DOMAIN`, `TRAEFIK_PUBLIC_NETWORK`, `EMAIL`
- Use `${VARIABLE}` syntax in docker-compose files

## ⚠️ Known Issues & Gotchas

### Critical Issues to Watch For
1. **Docker Socket Exposure**: Traefik and Portainer mount Docker socket
2. **Latest Tags**: Some services use `latest` instead of pinned versions
3. **Resource Limits**: No memory/CPU limits set on containers
4. **Image Bloat**: Stemtool service is 11.8GB (needs optimization)

### Service-Specific Notes
- **Immich**: Photo management at photos.maxconway.com
  - Uses separate `immich` network for internal services (postgres, redis, ML)
  - Mounts /mnt/media/Photos as read-only external library
  - Requires .env file with database credentials
- **Portfolio**: Serves maxconway.com root domain
  - Static site with Nginx
  - Uses letsencrypt-dns resolver
- **Majorasmax-frontend**: Service directory at majorasmax.com
  - Currently routes both majorasmax.com AND maxconway.com (conflict with portfolio)
  - Should only route majorasmax.com
- **Stemtool**: Audio processing tool
  - Port 3001 exposed (security issue - should be removed)
  - Session-based isolation with automatic cleanup
  - Dual domain routing: stemtool.majorasmax.com and stemtool.maxconway.com
- **Jellyfin**: Requires NFS mounts at `/mnt/media/*`
  - Uses `latest` tag (should be pinned)
- **Music/Stream Players**: Similar codebases, potential for consolidation

### Network Configuration
- All services use external network named via `${TRAEFIK_PUBLIC_NETWORK}`
- Network must exist before starting services
- Traefik handles SSL termination and routing

## 🛡️ Security Considerations

### Current Security Issues
1. **Docker Socket Exposure**: Traefik (read-only) and Portainer (full access) mount Docker socket
2. **Latest Tags**: Portainer and Jellyfin use `latest` instead of pinned versions
3. **Missing Security Headers**: No security headers middleware in Traefik
4. **Exposed Port**: Stemtool exposes port 3001 directly (bypasses Traefik)
5. **Domain Routing Conflict**: Portfolio and majorasmax-frontend both claim maxconway.com
6. **Traefik API**: Exposed on port 8080 with `insecure: true`
7. **No Resource Limits**: Containers lack memory/CPU constraints
8. **Debug Logging**: Traefik runs with DEBUG log level in production

### Best Practices When Making Changes
- Always pin Docker image versions
- Add resource limits to new services
- Use least privilege principle
- Validate SSL certificate configuration
- Test changes in development first

## 🔍 Debugging & Troubleshooting

### Common Problems
1. **Service Won't Start**: Check Docker logs and network connectivity
   - Verify `web` network exists: `docker network ls | grep web`
   - Check for port conflicts: `docker ps --format "{{.Ports}}"`
2. **SSL Issues**: Verify DNS records and certificate resolver
   - Use `letsencrypt-dns` for Cloudflare-proxied domains
   - Check Cloudflare credentials in .env
   - Wait 2-3 minutes for certificate generation
3. **Port Conflicts**: Ensure no duplicate port mappings
   - Only Traefik should expose 80, 443, 8080
   - Remove direct port mappings from services
4. **Permission Errors**: Check volume mount permissions
   - Immich needs read access to /mnt/media/Photos
   - Jellyfin needs access to /mnt/media/*
5. **Domain Routing Conflicts**: Check for duplicate Host() rules
   - maxconway.com claimed by both portfolio and majorasmax-frontend
   - Use `docker logs traefik | grep -i "Host("` to see active routes

### Useful Debugging Commands
```bash
# Check Traefik routes
docker logs traefik | grep -i error

# Verify network connectivity
docker exec <container> ping <target>

# Check certificate status
docker exec traefik ls -la /letsencrypt/

# Monitor resource usage
docker stats

# Clean up resources
docker system prune -f
```

## 📝 Making Changes Safely

### Before Modifying Services
1. **Backup**: Ensure important data is backed up
2. **Document**: Update relevant documentation
3. **Test**: Validate changes don't break existing functionality
4. **Monitor**: Check logs after deployment

### Deployment Checklist
- [ ] Service builds successfully
- [ ] Health checks pass
- [ ] SSL certificate obtains correctly
- [ ] No resource conflicts
- [ ] Logs show no errors
- [ ] External access works

## 🚀 Performance Tips

### Image Optimization
- Use multi-stage builds for smaller images
- Choose Alpine base images when possible
- Remove unnecessary dependencies
- Optimize layer caching in Dockerfiles

### Resource Management
- Set appropriate memory/CPU limits
- Use volume mounts for persistent data
- Regular cleanup of unused images/containers
- Monitor disk usage on host

## 📚 Reference Files

### Key Configuration Files
- `traefik/traefik.yml`: Traefik main configuration
  - Defines HTTP/HTTPS entrypoints
  - Configures letsencrypt and letsencrypt-dns resolvers
  - Docker provider with auto-discovery
- `traefik/docker-compose.yml`: Traefik service definition
  - Mounts Docker socket (read-only)
  - Exposes ports 80, 443, 8080
  - Loads Cloudflare credentials from .env
- `.env`: Environment configuration (gitignored)
  - DOMAIN, EMAIL, TRAEFIK_PUBLIC_NETWORK
  - TRAEFIK_BASIC_AUTH credentials
  - CLOUDFLARE_EMAIL and CLOUDFLARE_API_KEY
- `services/*/docker-compose.yml`: Individual service definitions
  - Most use `letsencrypt-dns` resolver
  - All connect to `web` network
  - Traefik labels for routing and SSL

### Documentation Files
- `SECURITY_AUDIT.md`: Comprehensive security audit with action plan
- `README.md`: Complete service documentation and troubleshooting
- `AI_AGENT_GUIDE.md`: This file - guide for AI agents

## 🔄 Maintenance Schedule

### Daily
- Monitor service health
- Check available disk space
- Review error logs

### Weekly
- Update Docker images
- Clean unused resources
- Verify backup integrity

### Monthly
- Security audit
- Performance review
- Dependency updates

## 💡 Pro Tips for AI Agents

1. **Always check existing documentation** before making assumptions
2. **Use the update.sh script** for comprehensive service updates
3. **Monitor logs** after any changes to catch issues early
4. **Respect the .gitignore** - never commit sensitive files (.env, letsencrypt/)
5. **Test locally first** when possible before production changes
6. **Document your changes** in commit messages and relevant files
7. **Check for conflicts** when modifying domain routing
8. **Use letsencrypt-dns** resolver for Cloudflare-proxied domains
9. **Avoid exposing ports** directly - let Traefik handle routing
10. **Pin Docker image versions** instead of using `latest` tags

## 🔍 Current State (as of 2025-10-08)

### Active Services (16 containers)
- **Core**: traefik, portainer
- **Immich**: immich_server, immich_microservices, immich_machine_learning, immich_postgres, immich_redis
- **Web Apps**: maxconway-portfolio, majorasmax-frontend, gamernet, elden-ring, stemtool, screengrab
- **Media**: jellyfin, music-player, stream-player

### Domain Routing
- **maxconway.com**: Portfolio (conflict with majorasmax-frontend)
- **majorasmax.com**: Majorasmax-frontend
- **photos.maxconway.com**: Immich
- **traefik.maxconway.com**: Traefik dashboard
- **portainer.maxconway.com**: Portainer
- **gamernet.maxconway.com**: Gamernet
- **media.maxconway.com**: Jellyfin
- **music.maxconway.com**: Music player
- **stream.maxconway.com**: Stream player
- **screengrab.maxconway.com**: Screengrab
- **Dual domains**:
  - stemtool.majorasmax.com / stemtool.maxconway.com
  - eldenring.majorasmax.com / eldenring.maxconway.com

### SSL Certificate Resolvers
- **letsencrypt**: HTTP challenge for standard domains
- **letsencrypt-dns**: DNS challenge for Cloudflare-proxied domains
  - Used by: photos, stemtool, portfolio, majorasmax-frontend, elden-ring, gamernet, traefik dashboard

### Known Issues to Avoid
1. Don't add maxconway.com to new services (conflict)
2. Don't expose ports directly (use Traefik)
3. Don't use `latest` tags for production services
4. Don't forget to add services to health-check.sh and update.sh
5. Don't modify .env file (it's gitignored for security)
