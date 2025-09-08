# AI Agent Guide for Homeserver Management

## 🤖 Quick Start for AI Agents

This guide helps AI agents understand and work with the homeserver codebase efficiently.

### Directory Structure Overview
```
homeserver/
├── .env                    # Environment variables (gitignored)
├── start.sh               # Main startup script
├── update.sh              # Comprehensive update script
├── traefik/               # Reverse proxy configuration
├── portainer/             # Container management UI
└── services/              # Individual service deployments
    ├── template/          # Service template for new deployments
    ├── portfolio/         # Personal portfolio website
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
- **Stemtool**: Missing `version` in docker-compose.yml, hardcoded domain
- **Portfolio**: Missing network `name` field
- **Jellyfin**: Requires NFS mounts at `/mnt/media/*`
- **Music/Stream Players**: Similar codebases, potential for consolidation

### Network Configuration
- All services use external network named via `${TRAEFIK_PUBLIC_NETWORK}`
- Network must exist before starting services
- Traefik handles SSL termination and routing

## 🛡️ Security Considerations

### Current Security Issues
1. **Weak Authentication**: Traefik uses admin/admin123
2. **Privileged Access**: Docker socket mounted in containers
3. **No Rate Limiting**: Missing in Traefik configuration
4. **Missing Headers**: No security headers middleware

### Best Practices When Making Changes
- Always pin Docker image versions
- Add resource limits to new services
- Use least privilege principle
- Validate SSL certificate configuration
- Test changes in development first

## 🔍 Debugging & Troubleshooting

### Common Problems
1. **Service Won't Start**: Check Docker logs and network connectivity
2. **SSL Issues**: Verify DNS records and certificate resolver
3. **Port Conflicts**: Ensure no duplicate port mappings
4. **Permission Errors**: Check volume mount permissions

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
- `traefik/docker-compose.yml`: Traefik service definition
- `services/template/docker-compose.yml`: Template for new services
- `start.sh`: Startup script with network creation
- `update.sh`: Update script with health checks

### Documentation Files
- `SECURITY_AUDIT.md`: Security issues and recommendations
- `IMPROVEMENTS.md`: Detailed improvement suggestions
- `README.md`: Basic usage instructions

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
4. **Respect the .gitignore** - never commit sensitive files
5. **Test locally first** when possible before production changes
6. **Document your changes** in commit messages and relevant files
