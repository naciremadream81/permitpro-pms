# Document Upload Troubleshooting

## Enhanced Error Logging Added

I've added enhanced error logging to the upload endpoint. When you upload a document, the logs will now show:
- Error name
- Error message
- Full stack trace
- Detailed error information

## Current Status

✅ **Storage Permissions:** Working
✅ **Storage Directory:** Accessible and writable
✅ **Database:** Connected and working
✅ **Permit Exists:** Test permit found in database

## Next Steps to Debug

1. **Try uploading a document** and watch the container logs:
   ```bash
   docker compose logs -f permitpro-pms
   ```

2. **Check the browser console** for:
   - The exact error message
   - The HTTP status code
   - Any network errors

3. **Check the network tab** in browser dev tools:
   - Look at the request to `/api/permits/[id]/documents`
   - Check the response status and body
   - Verify the request payload

## Common Issues

### File Size
- Maximum: 50MB
- Check if your file exceeds this

### Authentication
- Ensure you're logged in
- Session might have expired - try refreshing

### Category Validation
- Must be one of: Application, Plans, Specifications, Engineering, Photos, Correspondence, Inspection, Certificate, Other

### Network Issues
- Check if the request is reaching the server
- Verify CORS settings (should be handled by Next.js)

## What to Share

When you try uploading, please share:
1. **Browser console error** (if any)
2. **Network tab response** (status code and error message)
3. **Container logs** showing the error:
   ```bash
   docker compose logs permitpro-pms | grep -A 10 "Error uploading"
   ```

This will help identify the exact issue!
