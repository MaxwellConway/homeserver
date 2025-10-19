# Homeserver Security Audit Report
**Last Updated**: 2025-10-08

## Executive Summary

This homeserver hosts 11 active services across multiple domains with Traefik v3.0 handling SSL termination and routing. The infrastructure uses both HTTP and DNS challenges for Let's Encrypt certificates, with DNS challenge configured for Cloudflare-proxied domains.

**Overall Security Posture**: Moderate - Core security practices in place, but several areas need hardening.

---

## 🔴 Critical Security Issues

### 1. Docker Socket Exposure
- **Issue**: Traefik and Portainer mount `/var/run/docker.sock`
- **Risk**: Full Docker daemon access = root access to host system
- **Services Affected**: 
  - `traefik` (read-only mount)
  - `portainer` (full access)
- **Impact**: Container escape could lead to complete host compromise
- **Recommendation**: 
  - Implement Docker socket proxy (tecnativa/docker-socket-proxy)
  - Restrict Portainer to agent-based access
  - Consider rootless Docker for additional isolation

### 2. Latest Tag Usage
- **Issue**: Some services use `latest` tags instead of pinned versions
- **Risk**: Unpredictable updates, potential breaking changes, security vulnerabilities
- **Services Affected**: 
  - `portainer/portainer-ce:latest`
  - `jellyfin/jellyfin:latest`
- **Recommendation**: Pin to specific semantic versions (e.g., `portainer-ce:2.19.4`)

### 3. Missing Security Headers
- **Issue**: No security headers middleware configured in Traefik
- **Risk**: Vulnerable to XSS, clickjacking, MIME-sniffing attacks
- **Affected**: All web services
- **Recommendation**: Add Traefik middleware with:
  ```yaml
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Referrer-Policy: strict-origin-when-cross-origin
  - Content-Security-Policy: default-src 'self'
  ```

### 4. Exposed Port on Stemtool
- **Issue**: Port 3001 exposed directly to host in `stemtool/docker-compose.yml`
- **Risk**: Bypasses Traefik security, direct container access
- **Recommendation**: Remove port mapping, rely solely on Traefik routing

---

## 🟡 Medium Priority Issues

### 1. Resource Limits
- **Issue**: No memory/CPU limits on containers
- **Risk**: Resource exhaustion, DoS, noisy neighbor problems
- **Services Affected**: All services
- **Recommendation**: Add resource constraints to all docker-compose files:
  ```yaml
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
  ```

### 2. Network Segmentation
- **Issue**: All services on single `web` network
- **Risk**: Lateral movement if one service is compromised
- **Current State**: Immich properly uses separate `immich` network for internal services
- **Recommendation**: 
  - Create separate networks per service group
  - Only expose web-facing containers to `web` network
  - Backend services (databases, caches) on isolated networks

### 3. Inconsistent Network Configuration
- **Issue**: Some services use `${TRAEFIK_PUBLIC_NETWORK}`, others hardcode `web`
- **Risk**: Configuration drift, deployment failures
- **Services Affected**: gamernet (uses variable), others (hardcoded)
- **Recommendation**: Standardize on hardcoded `web` or use variable consistently

### 4. Traefik API Exposure
- **Issue**: Traefik API exposed on port 8080 with `insecure: true`
- **Risk**: Unauthenticated API access on local network
- **Recommendation**: 
  - Remove `insecure: true` from traefik.yml
  - Access dashboard only via authenticated HTTPS route

### 5. Dual Domain Routing Conflicts
- **Issue**: Portfolio and majorasmax-frontend both claim `maxconway.com`
- **Risk**: Unpredictable routing behavior, service conflicts
- **Current State**: 
  - portfolio: `Host(\`maxconway.com\`)`
  - majorasmax-frontend: `Host(\`majorasmax.com\`) || Host(\`maxconway.com\`)`
- **Recommendation**: Remove `maxconway.com` from majorasmax-frontend routing

---

## 🟢 Low Priority Issues

### 1. Backup Automation
- **Status**: Backup script exists but not automated
- **Risk**: Data loss in case of failure
- **Recommendation**: 
  - Set up cron job for `./scripts/backup.sh`
  - Implement off-site backup rotation
  - Test restore procedures regularly

### 2. Log Management
- **Issue**: No centralized logging or log rotation
- **Risk**: Disk space exhaustion, difficult troubleshooting
- **Recommendation**: 
  - Configure Docker log rotation in daemon.json
  - Consider lightweight log aggregation (Loki + Grafana)

### 3. Health Check Coverage
- **Issue**: Only Immich and Jellyfin have health checks
- **Risk**: Undetected service failures
- **Recommendation**: Add health checks to all service docker-compose files

### 4. Traefik Debug Logging
- **Issue**: `log.level: DEBUG` in production
- **Risk**: Performance impact, verbose logs
- **Recommendation**: Change to `INFO` or `WARN` for production

### 5. Image Optimization
- **Issue**: Some custom images may be unoptimized
- **Risk**: Slow deployments, disk space usage
- **Recommendation**: 
  - Use multi-stage builds
  - Choose Alpine base images where possible
  - Regular cleanup via `./scripts/cleanup.sh`

---

## ✅ Security Strengths

### 1. SSL/TLS Configuration
- ✅ All services use HTTPS with automatic Let's Encrypt certificates
- ✅ DNS challenge configured for Cloudflare-proxied domains
- ✅ HTTP to HTTPS redirect middleware active
- ✅ EC256 key type for better performance

### 2. Authentication
- ✅ Traefik dashboard protected with basic authentication
- ✅ Credentials stored in gitignored `.env` file
- ✅ No hardcoded secrets in repository

### 3. Service Isolation
- ✅ Immich uses separate internal network for database/redis
- ✅ Services use restart policies for reliability
- ✅ Stemtool implements session-based isolation

### 4. Media Access
- ✅ Photo library mounted read-only in Immich
- ✅ NFS mounts for media files (external backup responsibility)

### 5. Infrastructure
- ✅ Traefik v3.0 (current stable version)
- ✅ Automated service discovery via Docker provider
- ✅ Health check script for monitoring

---

## Immediate Action Plan

### Priority 1 (This Week)
1. **Remove port 3001 exposure** from stemtool docker-compose.yml
2. **Fix domain routing conflict** between portfolio and majorasmax-frontend
3. **Pin versions** for Portainer and Jellyfin
4. **Change Traefik log level** from DEBUG to INFO

### Priority 2 (This Month)
1. **Add security headers middleware** to Traefik configuration
2. **Implement resource limits** on all services
3. **Remove `insecure: true`** from Traefik API configuration
4. **Standardize network naming** across all services
5. **Set up automated backups** via cron

### Priority 3 (This Quarter)
1. **Implement Docker socket proxy** for Traefik and Portainer
2. **Add health checks** to all services
3. **Set up log rotation** and basic monitoring
4. **Network segmentation** for service groups
5. **Regular security update schedule**

---

## Compliance & Best Practices

### Docker Security
- ⚠️ Docker socket mounted (critical risk)
- ✅ Most services run as non-root users
- ⚠️ No resource limits configured
- ✅ Restart policies configured

### Network Security
- ✅ All traffic encrypted via HTTPS
- ⚠️ Single network for all services
- ✅ Traefik handles SSL termination
- ⚠️ API exposed on port 8080

### Access Control
- ✅ Basic authentication on Traefik dashboard
- ✅ Environment variables for secrets
- ⚠️ No rate limiting configured
- ⚠️ No fail2ban or intrusion detection

### Monitoring & Logging
- ✅ Health check script available
- ⚠️ No automated monitoring
- ⚠️ No centralized logging
- ⚠️ Debug logging in production

---

## Conclusion

The homeserver has a solid foundation with proper SSL/TLS, authentication, and service isolation. The most critical issues are Docker socket exposure and missing security headers. Implementing the Priority 1 actions will significantly improve the security posture with minimal effort.

**Next Review Date**: 2026-01-08 (Quarterly)
