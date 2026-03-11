# Docker Setup for PermitPro PMS

This guide explains how to run PermitPro PMS using Docker and connect it to the `postiz-traefik` network.

## Prerequisites

- Docker and Docker Compose installed
- The `postiz-traefik` network must exist (external network)
- Environment variables configured (see below)

## Quick Start

1. **Create the `.env` file** (if it doesn't exist):
   ```bash
   cp .env.example .env
   ```

2. **Update `.env` with your configuration**:
   ```env
   DATABASE_URL="file:/app/data/dev.db"
   NEXTAUTH_URL="http://your-domain.com"  # Update with your domain
   NEXTAUTH_SECRET="your-secret-here"     # Generate with: openssl rand -base64 32
   STORAGE_ROOT="/app/storage"
   ```

3. **Create the postiz-traefik network** (if it doesn't exist):
   ```bash
   docker network create postiz-traefik
   ```

4. **Build and start the container**:
   ```bash
   docker-compose up -d --build
   ```

5. **Run database migrations** (if needed):
   ```bash
   docker-compose exec permitpro-pms npx prisma migrate deploy
   ```

6. **Seed the database** (optional):
   ```bash
   docker-compose exec permitpro-pms npx tsx prisma/seed.ts
   ```

## Configuration

### Environment Variables

The application uses the following environment variables (set in `.env` file):

- `DATABASE_URL` - Database connection string (SQLite: `file:/app/data/dev.db`)
- `NEXTAUTH_URL` - Public URL of your application
- `NEXTAUTH_SECRET` - Secret key for JWT encryption
- `STORAGE_ROOT` - Directory for file storage (default: `/app/storage`)

### Volumes

The Docker setup uses the following volumes:

- `./data` - Database files (SQLite database)
- `./storage` - Uploaded documents and files
- `./prisma` - Prisma schema (read-only, for migrations)

### Network

The container is connected to the `postiz-traefik` network as an external network. This allows it to communicate with other services on the same network (e.g., Traefik reverse proxy).

## Docker Compose Commands

```bash
# Start the application
docker-compose up -d

# Stop the application
docker-compose stop

# View logs
docker-compose logs -f permitpro-pms

# Rebuild the container
docker-compose up -d --build

# Execute commands in the container
docker-compose exec permitpro-pms sh

# Run database migrations
docker-compose exec permitpro-pms npx prisma migrate deploy

# Access Prisma Studio
docker-compose exec permitpro-pms npx prisma studio
```

## Traefik Integration

Traefik labels have been automatically configured in `docker-compose.yml`. The application is set up to be routed through Traefik.

**Important:** Update the domain in `docker-compose.yml`:
- Change `permitpro.yourdomain.com` to your actual domain name
- Ensure your domain DNS points to your server
- Update `NEXTAUTH_URL` in your `.env` file to match your domain (with `https://`)

The Traefik configuration includes:
- Automatic HTTPS with Let's Encrypt
- SSL/TLS termination
- Load balancing to port 3000
- Health checks

After updating the domain, restart the container:
```bash
docker compose up -d
```

## Troubleshooting

### Database Migration Issues

If migrations fail, you can run them manually:

```bash
docker-compose exec permitpro-pms npx prisma migrate deploy
```

### Permission Issues

If you encounter permission issues with storage or database directories:

```bash
# Fix permissions
sudo chown -R $USER:$USER ./data ./storage
```

### Container Won't Start

Check the logs:

```bash
docker-compose logs permitpro-pms
```

### Network Not Found

If you get an error about the network not existing:

```bash
docker network create postiz-traefik
```

Or if the network already exists with a different name, update `docker-compose.yml`:

```yaml
networks:
  postiz-traefik:
    external: true
    name: your-actual-network-name
```

## Production Considerations

1. **Use PostgreSQL** instead of SQLite for production:
   - Update `DATABASE_URL` to use PostgreSQL connection string
   - Update `prisma/schema.prisma` to use `provider = "postgresql"`
   - Run migrations after changing the database

2. **Set strong secrets**:
   ```bash
   openssl rand -base64 32  # For NEXTAUTH_SECRET
   ```

3. **Configure proper NEXTAUTH_URL**:
   - Should match your public domain
   - Must use HTTPS in production

4. **Backup volumes**:
   - Regularly backup `./data` and `./storage` directories
   - Consider using Docker volumes for better backup strategies

5. **Resource limits**:
   Add resource limits to `docker-compose.yml`:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```

