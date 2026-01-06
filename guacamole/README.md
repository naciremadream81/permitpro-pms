# Guacamole Setup

## ⚠️ Important: ARM64 (Raspberry Pi / Apple Silicon) Support

The official Guacamole Docker images (`guacamole/guacamole` and `guacamole/guacd`) **only support AMD64 architecture**. They do not have ARM64 builds available.

### Options for ARM64 Systems:

#### Option 1: Use Docker Profiles (Recommended for ARM64)
Guacamole services are disabled by default on ARM64 systems using Docker Compose profiles. To enable them, you'll need to use platform emulation (slower):

1. Install QEMU for platform emulation:
   ```bash
   docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
   ```

2. Uncomment the `platform: linux/amd64` lines in `docker-compose.yml` for:
   - `guacamole`
   - `guacd`
   - `guacamole-init`

3. Start Guacamole services:
   ```bash
   docker compose --profile guacamole up -d
   ```

**Note:** Emulation will be slower than native ARM64. Consider building from source or using an alternative for better performance.

#### Option 2: Build from Source (Better Performance on ARM64)
Build Guacamole from source for native ARM64 support. This requires more setup but provides better performance.

1. Clone the Guacamole repository
2. Build the Docker images with ARM64 support
3. Update `docker-compose.yml` to use your custom-built images

See: https://github.com/apache/guacamole-client

#### Option 3: Use Alternative Remote Desktop Solutions
Consider alternatives that have native ARM64 support:
- **Remmina** (via X11 forwarding)
- **NoMachine** (has ARM64 builds)
- **TigerVNC** + **noVNC** (lightweight, ARM64 compatible)

#### Option 4: Run on AMD64 System
If you have access to an AMD64 system, run Guacamole there and connect via the network.

---

## Standard Setup (AMD64 Systems)

### First-time setup:
1. Start all services (including Guacamole):
   ```bash
   docker compose --profile guacamole up -d
   ```
   
   **Note:** Guacamole services are in a profile, so you must explicitly enable them with `--profile guacamole`.

2. Wait for the database to initialize (check logs):
   ```bash
   docker compose logs guacamole guacamole-init
   ```

3. Access Guacamole at: https://guacamole.permitpro.icu

4. Default credentials:
   - Username: `guacadmin`
   - Password: `guacadmin`
   
   **⚠️ IMPORTANT:** Change the default password immediately after first login!

### Configuration

Guacamole services are configured in `docker-compose.yml`:
- Database: MySQL (`guacamole-db`)
- Web interface: Accessible via Traefik at `guacamole.permitpro.icu`
- SSL/TLS: Automatic via Let's Encrypt

### Environment Variables

Add these to your `.env` file:
```env
GUACAMOLE_DB_ROOT_PASSWORD="change-root-password"
GUACAMOLE_DB_PASSWORD="change-this-password"
```

### Troubleshooting

- **Database initialization fails**: Check that `guacamole-db` is healthy before `guacamole-init` runs
- **Can't connect to guacd**: Ensure both `guacd` and `guacamole` containers are on the same network
- **SSL certificate errors**: Verify Traefik is properly configured and the domain is accessible
