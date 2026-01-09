# Cloudflare Tunnel & Traefik Configuration Fixes

## Issues Fixed

### 1. Traefik Dashboard Not Accessible via Cloudflare Tunnel

**Problem:** Traefik dashboard router was configured to use `websecure` entrypoint (HTTPS on port 443) with TLS certificate resolver, but Cloudflare tunnel was routing to HTTP port 8080. Since Cloudflare terminates SSL, we should use HTTP.

**Solution:** 
- Changed Traefik dashboard router to use `web` entrypoint (HTTP on port 80)
- Removed TLS configuration since Cloudflare handles SSL termination
- Cloudflare tunnel routes to `http://traefik:8080` (correct)

**Files Changed:**
- `docker-compose.yml` - Traefik dashboard router configuration

### 2. Guacamole Not Accessible via Cloudflare Tunnel

**Problem:** 
- Guacamole router was configured for `websecure` (HTTPS) but Cloudflare routes via HTTP
- Missing `httpHostHeader` in Cloudflare config

**Solution:**
- Changed Guacamole router to use `web` entrypoint (HTTP)
- Removed TLS configuration (Cloudflare handles SSL)
- Added `httpHostHeader: guacamole.permitpro.icu` to Cloudflare config

**Files Changed:**
- `docker-compose.yml` - Guacamole router configuration
- `cloudflared/config.yml` - Added httpHostHeader

### 3. Guacamole Architecture Mismatch (ARM64 vs AMD64)

**Problem:** Guacamole containers were crashing with "exec format error" because:
- Running on ARM64 (Raspberry Pi)
- Guacamole images are AMD64 only
- QEMU emulation wasn't properly configured

**Solution:**
- Verified QEMU user-static was installed (`qemu-user-static` package)
- Confirmed binfmt support was configured
- Docker can now run AMD64 containers via QEMU emulation
- Guacamole containers now start successfully

**Note:** Performance will be slower than native ARM64, but functional.

### 4. ACME Certificate File Permissions

**Problem:** Let's Encrypt ACME file had permissions 644, but Traefik requires 600.

**Solution:**
- Fixed permissions: `chmod 600 ./letsencrypt/acme.json`

**Note:** Let's Encrypt errors in logs are expected since Cloudflare handles SSL termination. The `websecure` routers are optional and won't affect functionality.

## Current Configuration

### Traefik Dashboard
- **URL:** `https://traefik.permitpro.icu` (via Cloudflare tunnel)
- **Internal:** `http://traefik:8080` (HTTP, no TLS)
- **Entrypoint:** `web` (port 80)
- **SSL:** Terminated by Cloudflare

### Guacamole
- **URL:** `https://guacamole.permitpro.icu` (via Cloudflare tunnel)
- **Internal:** `http://guacamole:8080` (HTTP, no TLS)
- **Entrypoint:** `web` (port 80)
- **SSL:** Terminated by Cloudflare

### Cloudflare Tunnel Routing
All services route through Traefik on port 80 (HTTP):
- `permitpro.permitpro.icu` → `http://traefik:80`
- `traefik.permitpro.icu` → `http://traefik:8080` (dashboard)
- `guacamole.permitpro.icu` → `http://traefik:80`
- `n8n.permitpro.icu` → `http://traefik:80`

## Verification Steps

1. **Check container status:**
   ```bash
   docker compose ps
   ```
   All containers should be "Up" (guacamole, guacd, traefik, cloudflared)

2. **Access Traefik Dashboard:**
   - Open: `https://traefik.permitpro.icu`
   - Should show Traefik dashboard (no SSL errors)

3. **Access Guacamole:**
   - Open: `https://guacamole.permitpro.icu`
   - Default credentials: `guacadmin` / `guacadmin`
   - **⚠️ Change password immediately!**

4. **Check Cloudflare tunnel logs:**
   ```bash
   docker compose logs cloudflared | tail -20
   ```
   Should show successful connections, no TLS errors

5. **Check Traefik logs:**
   ```bash
   docker compose logs traefik | tail -20
   ```
   Let's Encrypt errors are expected (Cloudflare handles SSL)

## Important Notes

### SSL/TLS Configuration
- **Cloudflare terminates SSL** - All HTTPS happens at Cloudflare edge
- Traefik receives HTTP traffic internally
- Let's Encrypt certificates are **not needed** for services behind Cloudflare tunnel
- The `websecure` routers in docker-compose.yml are optional (for direct access)

### Guacamole Performance
- Running on ARM64 via QEMU emulation
- Performance will be slower than native ARM64
- For better performance, consider:
  - Building Guacamole from source for ARM64
  - Using alternative remote desktop solutions (see `guacamole/README.md`)

### Troubleshooting

**If Traefik dashboard doesn't load:**
- Check Cloudflare tunnel is running: `docker compose ps cloudflared`
- Verify DNS: `traefik.permitpro.icu` should point to Cloudflare tunnel
- Check Traefik logs: `docker compose logs traefik`

**If Guacamole doesn't load:**
- Ensure Guacamole profile is enabled: `docker compose --profile guacamole ps`
- Check Guacamole logs: `docker compose logs guacamole`
- Verify QEMU is working: `docker run --rm --platform linux/amd64 alpine:latest uname -m` (should return `x86_64`)

**If containers restart:**
- Check logs: `docker compose logs <service-name>`
- Verify QEMU is installed: `dpkg -l | grep qemu-user-static`
- Check binfmt: `cat /proc/sys/fs/binfmt_misc/qemu-x86_64`

## Files Modified

1. `docker-compose.yml`
   - Traefik dashboard router: Changed to `web` entrypoint, removed TLS
   - Guacamole router: Changed to `web` entrypoint, removed TLS

2. `cloudflared/config.yml`
   - Added `httpHostHeader` for Guacamole routing

3. `letsencrypt/acme.json`
   - Fixed permissions to 600 (if file exists)

## Next Steps

1. **Change Guacamole default password** immediately after first login
2. **Monitor performance** - Guacamole may be slower on ARM64
3. **Consider alternatives** if performance is unacceptable (see `guacamole/README.md`)
