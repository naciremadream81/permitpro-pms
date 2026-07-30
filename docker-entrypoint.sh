#!/bin/sh
set -e

echo "Starting PermitPro PMS..."

# Run database migrations — fail closed so the app never serves against a
# drifted schema (swallowed migrate failures cause write errors / data loss).
echo "Running database migrations..."
prisma migrate deploy

# Start the application
echo "Starting Next.js application..."
exec node server.js
