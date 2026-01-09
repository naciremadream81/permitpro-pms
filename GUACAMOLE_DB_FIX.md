# Guacamole Database Initialization Fix

## Issue

Guacamole was returning HTTP 500 errors when trying to log in:
```
Table 'guacamole_db.guacamole_user' doesn't exist
```

## Root Cause

The Guacamole database schema was never initialized. The database exists but has no tables.

## Solution Applied

Ran the Guacamole database initialization script to create all required tables:

```bash
docker compose --profile guacamole run --rm guacamole-init | \
  docker compose exec -T guacamole-db mysql -u guacamole_user -pchange-this-password guacamole_db
```

This:
1. Generates the SQL schema from the Guacamole image
2. Pipes it directly to MySQL to execute
3. Creates all required tables and the default `guacadmin` user

## Default Credentials

After initialization, you can log in with:
- **Username:** `guacadmin`
- **Password:** `guacadmin`

**⚠️ IMPORTANT:** Change the default password immediately after first login!

## Verification

To verify the database is initialized:

```bash
# Check tables exist
docker compose exec guacamole-db mysql -u guacamole_user -pchange-this-password guacamole_db -e "SHOW TABLES;"

# Check default user exists
docker compose exec guacamole-db mysql -u guacamole_user -pchange-this-password guacamole_db -e "SELECT username FROM guacamole_user JOIN guacamole_entity ON guacamole_user.entity_id = guacamole_entity.entity_id WHERE guacamole_entity.type = 'USER';"
```

## If You Need to Re-initialize

If you need to start fresh:

1. **Backup any existing data first!**
2. **Drop and recreate the database:**
   ```bash
   docker compose exec guacamole-db mysql -u root -pchange-root-password -e "DROP DATABASE guacamole_db; CREATE DATABASE guacamole_db;"
   ```
3. **Re-run initialization:**
   ```bash
   docker compose --profile guacamole run --rm guacamole-init | \
     docker compose exec -T guacamole-db mysql -u guacamole_user -pchange-this-password guacamole_db
   ```

## Next Steps

1. **Log in to Guacamole:**
   - Visit: `https://guacamole.permitpro.icu`
   - Use: `guacadmin` / `guacadmin`

2. **Change the default password:**
   - Go to Settings → Preferences → Change Password
   - Set a strong password

3. **Create your first connection:**
   - Go to Settings → Connections
   - Click "New Connection"
   - Configure your RDP/SSH/VNC connection

## Note

The `guacamole-init` service in `docker-compose.yml` is configured to run once, but it only generates SQL - it doesn't execute it. You need to pipe the output to MySQL manually, or the init script would need to be modified to execute the SQL automatically.
