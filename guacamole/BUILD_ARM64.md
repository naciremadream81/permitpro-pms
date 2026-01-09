# Building Guacamole for ARM64 from Source

You have the Guacamole source code in this directory! This guide will help you build native ARM64 Docker images for better performance than QEMU emulation.

## Prerequisites

1. **Docker** installed and running
2. **Build tools** (already installed if you extracted the source):
   - For guacamole-server: autoconf, automake, build tools, etc.
   - For guacamole-client: Maven, Java JDK

3. **Source code** (already present):
   - `guacamole-server-1.6.0/` - Server source code
   - `guacamole-client-1.6.0/` - Client source code

## Quick Build

Run the automated build script:

```bash
cd /home/archie/codebase/permitpro-pms/guacamole
./build-arm64.sh
```

This will:
1. Build `guacamole/guacd:arm64-local` (the daemon/server)
2. Build `guacamole/guacamole:arm64-local` (the web client)

**Note:** Building can take 30-60 minutes depending on your Raspberry Pi's performance.

## Manual Build Steps

If you prefer to build manually:

### 1. Build guacd (guacamole-server)

```bash
cd guacamole-server-1.6.0
docker build \
    --platform linux/arm64 \
    --build-arg BUILD_ARCHITECTURE=ARM \
    -t guacamole/guacd:arm64-local \
    -f Dockerfile \
    .
```

### 2. Build guacamole-client

```bash
cd ../guacamole-client-1.6.0
docker build \
    --platform linux/arm64 \
    -t guacamole/guacamole:arm64-local \
    -f Dockerfile \
    .
```

## Update docker-compose.yml

After building, update `docker-compose.yml` to use your custom-built images:

1. **Change image names:**
   - `guacamole/guacamole:latest` → `guacamole/guacamole:arm64-local`
   - `guacamole/guacd:latest` → `guacamole/guacd:arm64-local`

2. **Remove platform lines** (no longer needed for emulation):
   - Remove `platform: linux/amd64` from `guacamole` service
   - Remove `platform: linux/amd64` from `guacd` service
   - Remove `platform: linux/amd64` from `guacamole-init` service

3. **Update guacamole-init** to use the custom image:
   - Change `image: guacamole/guacamole:latest` → `guacamole/guacamole:arm64-local`

## Example docker-compose.yml Changes

```yaml
guacamole:
  image: guacamole/guacamole:arm64-local  # Changed from :latest
  # platform: linux/amd64  # REMOVED - no longer needed
  container_name: guacamole
  # ... rest of config

guacd:
  image: guacamole/guacd:arm64-local  # Changed from :latest
  # platform: linux/amd64  # REMOVED - no longer needed
  container_name: guacd
  # ... rest of config

guacamole-init:
  image: guacamole/guacamole:arm64-local  # Changed from :latest
  # platform: linux/amd64  # REMOVED - no longer needed
  # ... rest of config
```

## Start Services

After updating docker-compose.yml:

```bash
cd /home/archie/codebase/permitpro-pms

# Stop existing containers (if running)
docker compose --profile guacamole down

# Start with new ARM64 images
docker compose --profile guacamole up -d
```

## Verify Build

Check that containers are running with native ARM64:

```bash
docker compose ps guacamole guacd

# Check architecture
docker inspect guacamole | grep -i arch
docker inspect guacd | grep -i arch
```

## Troubleshooting

### Build Fails with "Out of Memory"

The build process is memory-intensive. If you encounter OOM errors:

1. **Increase swap space:**
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=2048
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

2. **Build one at a time** instead of parallel builds

3. **Reduce build parallelism:**
   ```bash
   docker build --build-arg BUILD_JOBS=1 ...
   ```

### Build Takes Too Long

- This is normal on Raspberry Pi - expect 30-60 minutes
- The build compiles many dependencies from source
- Consider building overnight or on a more powerful ARM64 system

### Image Not Found After Build

Verify images were created:
```bash
docker images | grep guacamole
```

You should see:
- `guacamole/guacamole:arm64-local`
- `guacamole/guacd:arm64-local`

## Performance Comparison

- **QEMU Emulation:** ~2-5x slower than native
- **Native ARM64:** Full performance, no emulation overhead

## Next Steps

1. Build the images using `./build-arm64.sh`
2. Update `docker-compose.yml` with the new image names
3. Remove `platform: linux/amd64` lines
4. Restart services
5. Enjoy native ARM64 performance! 🚀
