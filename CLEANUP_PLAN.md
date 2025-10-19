# Homeserver Storage Cleanup Plan

**Last Updated**: Oct 19, 2025 12:30am UTC

## 🎉 Current Storage Status

### Summary - **MAJOR IMPROVEMENTS** ✅
- **Root filesystem**: **37%** full (was 92%, **-55% improvement!** 🎉)
- **Total homeserver directory**: **5.0GB** (was 50GB, **-45GB freed!**)
- **Git repository size**: 3GB (still bloated with historical large files)
- **Immich uploads**: ✅ Correctly stored on NAS (45GB on NAS, only 20KB locally)
- **Node modules**: ✅ All removed from Git tracking
- **Docker system**: Clean - only 179.7MB reclaimable (was 6GB)
- **✅ FIXED**: Immich server/microservices now running healthy!

---

## ✅ What's Already Protected

1. **Immich library** - Already in .gitignore (line 37)
2. **Jellyfin cache/transcodes** - Already in .gitignore
3. **Data directories** - Already in .gitignore (`**/data/`)

---

## 🔧 Actions Completed

1. ✅ Added `**/node_modules/` to .gitignore (lines 40-42)
2. ✅ Added `**/package-lock.json` to .gitignore (line 41)
3. ✅ Fixed Immich crash-loop - all containers now healthy
4. ✅ Major Docker cleanup - freed ~45GB total space
5. ✅ Disk usage reduced from 92% to 37%
6. ✅ Removed stemtool node_modules from Git tracking (~300-400MB)

## ⚠️ Remaining Issues

1. **Git history bloat**: 3GB repository size from historical large files (optional to fix)
2. **Gamernet/Elden-ring services**: Not currently running (investigate if needed)

---

## 📋 Recommended Actions

### Priority 0: ✅ Fix Immich Crash Loop (COMPLETED)

**Status**: ✅ COMPLETED
**Problem**: Immich containers were restarting continuously
**Result**: All Immich containers now running healthy (immich_server, immich_microservices, immich_postgres, immich_redis, immich_machine_learning)

---

### Priority 1: ✅ Remove node_modules from Git History (COMPLETED)

**Status**: ✅ COMPLETED
**Problem**: `services/stemtool/node_modules` was tracked in Git (~300-400MB)
**Result**: Successfully removed all node_modules from Git tracking
- Commit: `ede2c9b3` - "Remove stemtool node_modules from Git tracking"
- 0 node_modules files now in Git (verified)
- Local files preserved for development
- Future node_modules will be ignored via .gitignore

**Note**: Portfolio (402MB node_modules) is a separate repo/submodule.

---

### Priority 2: ✅ Docker Cleanup (COMPLETED)

**Status**: ✅ COMPLETED
**Problem**: Docker space consumption
**Result**: Major cleanup completed - only 179.7MB reclaimable remaining (down from 6GB)

---

### Priority 3: Clean Up Git History (Optional but Recommended)

**Status**: NOT STARTED
**Problem**: Git history contains 3GB of old large files

**Solution** (DESTRUCTIVE - creates new repo):
```bash
cd /home/maxwell/homeserver

# Backup first!
git bundle create ../homeserver-backup.bundle --all

# Use BFG Repo-Cleaner or git-filter-repo
# Install git-filter-repo:
pip3 install git-filter-repo

# Remove files larger than 10MB from history
git filter-repo --strip-blobs-bigger-than 10M

# Force push (if using remote)
git push origin --force --all
```

**Warning**: This rewrites Git history. Coordinate with any collaborators.

---

### Priority 4: Optimize Stemtool Docker Image (Optional)

**Status**: DEFERRED (not urgent after major cleanup)
**Problem**: Stemtool Docker image could be optimized

**Solution**: Implement multi-stage build if needed in the future
```dockerfile
# Stage 1: Build
FROM node:18 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Stage 2: Runtime
FROM node:18-slim
WORKDIR /app
COPY --from=builder /app .
CMD ["npm", "start"]
```

**Expected savings**: 5-8GB (not critical now that disk is at 37%)

---

### Priority 5: ✅ Set Up Automated Cleanup (COMPLETED)

**Status**: ✅ COMPLETED
**Result**: Automated Docker cleanup configured and tested
- Created `/home/maxwell/homeserver/scripts/docker-cleanup-cron.sh`
- Cron job runs every Sunday at 2 AM
- Logs to `/home/maxwell/homeserver/logs/docker-cleanup.log`
- Tested successfully - reclaimed 1.26MB in test run
- Removes unused images, containers, volumes, and build cache

---

### Priority 6: ✅ Monitor Disk Usage (COMPLETED)

**Status**: ✅ COMPLETED
**Result**: Disk usage monitoring added to health-check.sh
- Alerts at 60% (notice), 75% (warning), 85% (critical)
- Currently showing: "✅ Disk usage healthy at 37%"
- Runs with every health check
- Fixed script to use `set +e` to continue on errors

---

## 📊 Space Savings Progress

| Action | Space Saved | Difficulty | Status |
|--------|-------------|------------|--------|
| ✅ Docker system prune | **~45GB** | Easy | **COMPLETED** |
| ✅ Remove stemtool node_modules from Git | ~400MB | Easy | **COMPLETED** |
| Clean Git history | ~2-3GB | Medium | Optional (not urgent) |
| Optimize Stemtool image | ~5-7GB | Medium | Deferred |
| Regular Docker cleanup (automated) | Ongoing | Easy | Not set up |
| **Total Achieved** | **~45GB** | - | **92% → 37%** |
| **Additional Potential** | **~2-3GB** | - | From optional tasks |

---

## 🛡️ Prevention Measures

### 1. Update .gitignore (DONE)
- Added `**/node_modules/`
- Added `**/package-lock.json`

### 2. Pre-commit Hook (Recommended)
Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash
# Prevent committing large files

MAX_SIZE=10485760 # 10MB in bytes

for file in $(git diff --cached --name-only); do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ $size -gt $MAX_SIZE ]; then
            echo "Error: $file is larger than 10MB ($size bytes)"
            exit 1
        fi
    fi
done
```

### 3. Docker Best Practices
- Always use `.dockerignore` files
- Use multi-stage builds
- Pin base image versions
- Regular cleanup with `docker system prune`

---

## 🎯 Next Steps - UPDATED Oct 19, 2025 1:05am

### **Medium Priority** (This Week):
1. [ ] Implement pre-commit hooks for large files
2. [ ] Investigate gamernet/elden-ring services status

### **Low Priority** (Optional):
1. [ ] Clean Git history with git-filter-repo (~3GB recovery) - not urgent
2. [ ] Optimize Stemtool Dockerfile - not urgent with 37% disk usage
3. [ ] Audit and document all service disk usage

### **Completed** ✅:
- [x] Push commits to origin - 11 commits pushed (Oct 19, 1:05am)
- [x] Commit all pending changes - 8 organized commits (Oct 19, 1:04am)
- [x] Add disk usage alerts to health-check.sh (Oct 19, 12:57am)
- [x] Set up automated Docker cleanup cron job (Oct 19, 12:57am)
- [x] Remove stemtool node_modules from Git tracking (Oct 19, 12:36am)
- [x] Fix Immich crash loop - all containers healthy (Oct 19)
- [x] Major Docker cleanup - freed ~45GB (Oct 19)
- [x] Disk usage reduced from 92% to 37% (Oct 19)
- [x] Update .gitignore with node_modules (Oct 12)
- [x] Update .gitignore with package-lock.json (Oct 12)

---

## 📝 Notes

- **Immich library (45GB)**: ✅ Correctly stored on NAS at `/mnt/media/Photos/Immich-Uploads` (not on local server)
- **Node modules**: Should only exist during local development, not in production Docker containers
- **Git history**: Consider if you need full history or can start fresh
- **Backups**: Always backup before destructive operations
- **NFS Mount**: NAS (192.168.1.218) properly mounted at `/mnt/media` for all media services

---

## 📊 Current System Snapshot (Oct 19, 2025)

### Disk Usage:
```
Filesystem: /dev/mapper/ubuntu--vg-ubuntu--lv
Total: 98G | Used: 34G | Available: 60G | Usage: 37% ⬇️ (was 92%)
```

### Docker Resources:
- **Images**: 14 total, 13 active, 17.99GB (179.7MB reclaimable)
- **Containers**: 14 running (all healthy)
- **Volumes**: 20 total, 9 active, 1.13GB
- **Build Cache**: 0B (cleaned)

### Service Status:
- ✅ Traefik, Portainer (core infrastructure - running)
- ✅ Jellyfin, Music-player, Stream-player (media services - running)
- ✅ Portfolio, Majorasmax, Gamernet, Elden-ring (web apps - running)
- ✅ Stemtool, Screengrab (utilities - running)
- ✅ **Immich Server, Microservices, ML, Postgres, Redis** (all healthy! 🎉)

### Git Status:
- 22 modified files pending commit
- 4 new untracked files (CLEANUP_PLAN.md, start-app-services.sh, stop-app-services.sh, check-migration.sh)
- ✅ 0 node_modules files tracked in Git (all removed!)
- Latest commit: `ede2c9b3` - removed stemtool node_modules

### Directory Sizes:
- Total homeserver: 5.0GB (was 50GB)
- Git repository: 3.0GB (historical bloat remains)
- Portfolio node_modules: 402MB (separate repo, not in main Git)

### Storage Distribution:
- **Local server**: 34GB total (37% of 98GB)
  - Git repo: 3GB
  - Docker images/volumes: ~18GB
  - System/other: ~13GB
- **NAS (192.168.1.218)**: Media files properly offloaded
  - Immich uploads: 45GB at `/mnt/media/Photos/Immich-Uploads`
  - Jellyfin/other media: On `/mnt/media/*`

---

## 🔗 Resources

- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
