# Guacamole Setup

The Guacamole database will be automatically initialized by the guacamole container on first run.

**First-time setup:**
1. Start all services: `docker compose up -d`
2. Wait for the database to initialize (check logs: `docker compose logs guacamole`)
3. Access Guacamole at: https://guacamole.yourdomain.com
4. Default credentials: `guacadmin` / `guacadmin` (change immediately!)

**Important:** Change the default password immediately after first login.
