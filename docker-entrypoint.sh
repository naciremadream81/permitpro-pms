#!/bin/sh
set -e

echo "Starting PermitPro PMS..."

# Run database migrations
echo "Running database migrations..."
prisma migrate deploy

# Start the application
echo "Starting Next.js application..."
exec node server.js
