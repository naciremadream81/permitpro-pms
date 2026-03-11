# Document Upload Debugging Guide

## Current Status

✅ **Storage Permissions:** Working
✅ **Storage Directory:** Accessible
✅ **File System:** Can create directories and write files
✅ **Environment:** STORAGE_ROOT is set correctly

## Enhanced Error Logging

I've added enhanced error logging to the upload endpoint. When you try to upload a document, check the logs:

```bash
docker compose logs permitpro-pms | grep -A 10 "Error uploading"
```

This will now show:
- Error name
- Error message  
- Error stack trace
- Full error details

## Common Issues to Check

### 1. File Size
- Maximum file size: 50MB
- Check if your file exceeds this limit

### 2. Authentication
- Ensure you're logged in
- Session might have expired

### 3. Permit ID
- Verify the permit exists in the database
- Check the permit ID in the URL is correct

### 4. Category Validation
- Category must be one of the valid enum values:
  - Application, Plans, Specifications, Engineering, Photos, Correspondence, Inspection, Certificate, Other

## Testing Steps

1. **Check browser console** for client-side errors
2. **Check network tab** for the actual HTTP response
3. **Check container logs** for server-side errors:
   ```bash
   docker compose logs --tail=50 permitpro-pms
   ```

## Next Steps

Try uploading a document and share:
1. The error message from the browser console
2. The HTTP status code from the network tab
3. The error logs from the container

This will help identify the exact issue.
