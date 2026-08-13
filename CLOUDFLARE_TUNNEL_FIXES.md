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

### 2. ACME Certificate File Permissions

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

### Cloudflare Tunnel Routing
All services route through Traefik on port 80 (HTTP):
- `permitpro.permitpro.icu` → `http://traefik:80`
- `traefik.permitpro.icu` → `http://traefik:8080` (dashboard)
- `n8n.permitpro.icu` → `http://traefik:80`

## Verification Steps

1. **Check container status:**
   ```bash
   docker compose ps
   ```
   All containers should be "Up" for enabled services.

2. **Access Traefik Dashboard:**
   - Open: `https://traefik.permitpro.icu`
   - Should show Traefik dashboard (no SSL errors)

3. **Check Cloudflare tunnel logs:**
   ```bash
   docker compose logs cloudflared | tail -20
   ```
   Should show successful connections, no TLS errors

4. **Check Traefik logs:**
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

### Troubleshooting

**If Traefik dashboard doesn't load:**
- Check Cloudflare tunnel is running: `docker compose ps cloudflared`
- Verify DNS: `traefik.permitpro.icu` should point to Cloudflare tunnel
- Check Traefik logs: `docker compose logs traefik`

**If containers restart:**
- Check logs: `docker compose logs <service-name>`

## Files Modified

1. `docker-compose.yml`
   - Traefik dashboard router: Changed to `web` entrypoint, removed TLS

2. `letsencrypt/acme.json`
   - Fixed permissions to 600 (if file exists)
