#!/bin/sh
set -e

echo "Starting PermitPro PMS..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy || echo "Migration failed or already up to date"

# Start the application
echo "Starting Next.js application..."
exec node server.js
