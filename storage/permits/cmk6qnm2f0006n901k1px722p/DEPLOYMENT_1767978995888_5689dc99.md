# PermitPaladin - Home Server Deployment Guide

## Overview
PermitPaladin is a comprehensive permit package management system designed for construction teams. This guide will help you deploy it on your home server (Raspberry Pi 4, Linux PC, or any Linux-based system).

## System Requirements

### Minimum Requirements
- **CPU**: 2 cores (ARM64 for Pi 4, x64 for PC)
- **RAM**: 4GB (8GB recommended)
- **Storage**: 20GB available space
- **OS**: Linux (Ubuntu 20.04+, Debian 11+, or Raspberry Pi OS)

### Recommended for Production
- **CPU**: 4+ cores
- **RAM**: 8GB+
- **Storage**: 100GB+ SSD
- **OS**: Ubuntu 22.04 LTS or Debian 12

## Quick Start with Docker (Recommended)

### 1. Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes to take effect
exit
# SSH back in
```

### 2. Clone and Deploy

```bash
# Clone the repository
git clone <your-repo-url>
cd PermitPaladin-2

# Create uploads directory
mkdir uploads

# Build and start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 3. Access the Application

- **Web Interface**: http://your-server-ip:3000
- **Database**: localhost:5432 (if accessing from host)

## Manual Installation (Advanced)

### 1. Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE permitpaladin;"
sudo -u postgres psql -c "CREATE USER permitpaladin WITH PASSWORD 'permitpaladin123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE permitpaladin TO permitpaladin;"
```

### 2. Install Node.js

```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Verify installation
node --version
npm --version
```

### 3. Setup Application

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Environment Configuration

```bash
# .env file contents
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-super-secret-session-key-change-this

# Database (local)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=permitpaladin
DB_USER=permitpaladin
DB_PASSWORD=permitpaladin123

# File Storage
FILE_STORAGE_PATH=./uploads
```

### 5. Database Setup

```bash
# Generate migrations
npm run db:generate

# Apply migrations
npm run db:migrate

# Initialize sample data
psql -h localhost -U permitpaladin -d permitpaladin -f init-db.sql
```

### 6. Build and Start

```bash
# Build application
npm run build

# Start production server
npm start
```

## Production Deployment

### 1. Reverse Proxy with Nginx

```bash
# Install Nginx
sudo apt install nginx -y

# Create site configuration
sudo nano /etc/nginx/sites-available/permitpaladin
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/permitpaladin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Systemd Service

```bash
# Create service file
sudo nano /etc/systemd/system/permitpaladin.service
```

```ini
[Unit]
Description=PermitPaladin Application
After=network.target postgresql.service

[Service]
Type=simple
User=permitpaladin
WorkingDirectory=/path/to/your/app
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable permitpaladin
sudo systemctl start permitpaladin
```

## Security Considerations

### 1. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000  # Only if not using reverse proxy
```

### 2. Database Security

```bash
# Change default passwords
sudo -u postgres psql -c "ALTER USER permitpaladin PASSWORD 'strong-password-here';"

# Restrict database access
sudo nano /etc/postgresql/*/main/postgresql.conf
# Set: listen_addresses = 'localhost'
sudo systemctl reload postgresql
```

### 3. Application Security

```bash
# Update session secret
# Use a strong, random string in your .env file

# Regular updates
sudo apt update && sudo apt upgrade -y
npm audit fix
```

## Monitoring and Maintenance

### 1. Log Management

```bash
# View application logs
docker-compose logs -f app

# View database logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# System logs
sudo journalctl -u permitpaladin -f
```

### 2. Backup Strategy

```bash
# Database backup
pg_dump -h localhost -U permitpaladin permitpaladin > backup_$(date +%Y%m%d).sql

# File backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Automated backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/permitpaladin"

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U permitpaladin permitpaladin > $BACKUP_DIR/db_$DATE.sql

# File backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

### 3. Performance Monitoring

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor system resources
htop
iotop
nethogs
```

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   sudo netstat -tulpn | grep :3000
   sudo kill -9 <PID>
   ```

2. **Database connection failed**
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT version();"
   ```

3. **Permission denied on uploads**
   ```bash
   sudo chown -R $USER:$USER uploads/
   chmod 755 uploads/
   ```

4. **Memory issues on Raspberry Pi**
   ```bash
   # Add swap file
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Getting Help

- Check logs: `docker-compose logs -f` or `sudo journalctl -u permitpaladin -f`
- Verify database: `npm run db:push`
- Test connection: `curl http://localhost:3000/api/health`

## Updates and Upgrades

### 1. Application Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 2. Database Migrations

```bash
# Generate new migrations
npm run db:generate

# Apply migrations
npm run db:migrate
```

### 3. System Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

## Support and Resources

- **Documentation**: Check the README.md file
- **Issues**: Report bugs and feature requests
- **Community**: Join our discussion forum

---

**Note**: This deployment guide assumes basic Linux knowledge. For production use, consider consulting with a system administrator or DevOps professional.
