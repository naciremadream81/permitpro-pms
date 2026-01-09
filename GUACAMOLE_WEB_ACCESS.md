# Guacamole Web Access Troubleshooting

## Current Status

✅ **Container:** Running and healthy
✅ **Network:** Connected to traefik-network (IP: 172.18.0.2)
✅ **Traefik Router:** Detected and enabled
✅ **Internal Access:** Guacamole responds at `/guacamole/` path
✅ **Cloudflare Tunnel:** Configured for `guacamole.permitpro.icu`

## Issue Identified

Cloudflare tunnel logs show it's adding a `/guacamole` path prefix:
```
"path":"guacamole","service":"http://traefik:80"
```

This path is **NOT** in the `cloudflared/config.yml` file, which means it's coming from the **Cloudflare Dashboard** configuration.

## Solution

The path prefix in Cloudflare Dashboard needs to be removed. Guacamole should be accessed at the root of the hostname, not with a path prefix.

### Steps to Fix in Cloudflare Dashboard:

1. **Go to Cloudflare Dashboard:**
   - Navigate to Zero Trust → Tunnels
   - Find your tunnel: `c9dc2d8d-c7e5-4ead-a7a6-fbe396fe63ea`
   - Click "Configure" on the tunnel

2. **Edit the Guacamole Ingress Rule:**
   - Find the rule for `guacamole.permitpro.icu`
   - **Remove any path prefix** (should be empty or `/`)
   - The service should be: `http://traefik:80`
   - The hostname should be: `guacamole.permitpro.icu`

3. **Save and Wait:**
   - Save the configuration
   - Wait 1-2 minutes for the tunnel to update
   - The tunnel will automatically reload the new configuration

### Alternative: Use config.yml Only

If you want to manage everything via `config.yml`:

1. **Remove the rule from Cloudflare Dashboard** (or ensure it matches config.yml exactly)
2. **Restart cloudflared:**
   ```bash
   docker compose restart cloudflared
   ```

## Verification

After fixing the Cloudflare Dashboard configuration:

1. **Check tunnel logs:**
   ```bash
   docker compose logs cloudflared | grep guacamole
   ```
   - Should show: `"hostname":"guacamole.permitpro.icu"` **without** `"path":"guacamole"`

2. **Test access:**
   - Visit: `https://guacamole.permitpro.icu`
   - Should see Guacamole login page
   - Default credentials: `guacadmin` / `guacadmin`

## Current Configuration

### docker-compose.yml
- Router rule: `Host(\`guacamole.permitpro.icu\`)`
- Entrypoint: `web` (HTTP)
- Service port: `8080`

### cloudflared/config.yml
```yaml
- hostname: guacamole.permitpro.icu
  service: http://traefik:80
  originRequest:
    noHappyEyeballs: true
    httpHostHeader: guacamole.permitpro.icu
```

**Note:** The config.yml is correct. The issue is in the Cloudflare Dashboard which is overriding it with a path prefix.

## Why This Happens

Cloudflare Dashboard can override the `config.yml` settings. When you configure a tunnel via the dashboard, it takes precedence. The tunnel logs show the **actual** configuration being used, which includes the path prefix from the dashboard.

## Next Steps

1. **Remove the path prefix from Cloudflare Dashboard**
2. **Wait for tunnel to reload** (1-2 minutes)
3. **Test access** at `https://guacamole.permitpro.icu`
4. **If still not working**, check:
   - DNS records for `guacamole.permitpro.icu`
   - Traefik logs: `docker compose logs traefik | grep guacamole`
   - Cloudflare tunnel logs: `docker compose logs cloudflared`
