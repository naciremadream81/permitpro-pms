# Guacamole Login 500 Error - Fixed

## Issue

Guacamole was returning HTTP 500 errors when trying to log in:
```
POST https://guacamole.permitpro.icu/guacamole/api/tokens
[HTTP/2 500  14598ms]
```

Error in logs:
```
Table 'guacamole_db.guacamole_user' doesn't exist
```

## Root Cause

The Guacamole database schema was never initialized. The database existed but had no tables.

## Solution Applied

Initialized the Guacamole database by running the schema creation script:

```bash
docker compose exec guacamole /opt/guacamole/bin/initdb.sh --mysql | \
  docker compose exec -T guacamole-db mysql -u guacamole_user -pchange-this-password guacamole_db
```

This created:
- ✅ 23 database tables
- ✅ Default `guacadmin` user with full permissions
- ✅ All required schema objects

## Default Login Credentials

After initialization, you can log in with:
- **Username:** `guacadmin`
- **Password:** `guacadmin`

**⚠️ IMPORTANT:** Change the default password immediately after first login!

## Verification

The database is now properly initialized:
- ✅ Tables created: 23 tables
- ✅ Default user exists: `guacadmin`
- ✅ Guacamole can connect to database

## Next Steps

1. **Log in to Guacamole:**
   - Visit: `https://guacamole.permitpro.icu`
   - Use: `guacadmin` / `guacadmin`
   - The login should now work without 500 errors

2. **Change the default password:**
   - Go to Settings → Preferences → Change Password
   - Set a strong password

3. **Create your first connection:**
   - Go to Settings → Connections
   - Click "New Connection"
   - Configure your RDP/SSH/VNC connection

## If You Need to Re-initialize

If you need to start fresh (⚠️ **WARNING:** This will delete all data):

```bash
# Drop and recreate database
docker compose exec guacamole-db mysql -u root -pchange-root-password -e "DROP DATABASE guacamole_db; CREATE DATABASE guacamole_db;"

# Re-initialize
docker compose exec guacamole /opt/guacamole/bin/initdb.sh --mysql | \
  docker compose exec -T guacamole-db mysql -u guacamole_user -pchange-this-password guacamole_db
```

## Note on Cloudflare Insights Warnings

The browser console warnings about Cloudflare Insights are harmless and can be ignored. They don't affect Guacamole functionality. See `CLOUDFLARE_INSIGHTS_FIX.md` for details.
