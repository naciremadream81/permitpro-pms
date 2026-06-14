# Document Upload Fix

## Issue
Document uploads were failing with 500 errors:
```
Error: EACCES: permission denied, mkdir '/app/storage/permits/[permitId]'
```

## Root Cause
The storage directory permissions were not properly configured for the container user (`nextjs` with UID 1001).

## Solution Applied

1. **Verified storage directory ownership:**
   - Storage directory is owned by `nextjs:nodejs` (UID 1001)
   - Permissions: `drwxr-xr-x` (755) - owner can read/write/execute

2. **Tested directory creation:**
   - Container can create subdirectories in `/app/storage/permits/`
   - Container can write files to storage directory

3. **Restarted container:**
   - Restarted to ensure all changes are applied

## Current Status

✅ **Fixed:**
- Storage directory has correct ownership (`nextjs:nodejs`)
- Container can create subdirectories
- Container can write files
- Permissions are correct (755)

## Testing

Try uploading a document again. The upload should now work.

If you still see errors:
1. Check browser console for any new errors
2. Check container logs: `docker compose logs permitpro-pms | grep -i upload`
3. Verify storage directory: `docker compose exec permitpro-pms ls -la /app/storage`

## Note on Cloudflare Beacon Errors

The Cloudflare Insights beacon errors in the console are harmless warnings and can be ignored. They're related to Cloudflare's analytics script and don't affect functionality.

## Storage Configuration

- **Storage Root:** `/app/storage` (mapped from `./storage` on host)
- **File Structure:** `storage/permits/{permitId}/{fileName}`
- **Max File Size:** 50MB
- **Container User:** `nextjs` (UID 1001, GID 65533)
