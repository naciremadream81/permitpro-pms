# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Install build dependencies for native modules (works on both amd64 and arm64)
RUN apk add --no-cache libc6-compat python3 make g++ \
    && rm -rf /var/cache/apk/*
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy and set up entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Generate Prisma Client
RUN npx prisma generate

# Build the application
# DATABASE_URL is required during build for pages that use Prisma
# This is a placeholder - the real value will be provided at runtime
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:./build-time-db.db"
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
# Next.js standalone output includes public files, so we don't need to copy it separately
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Create storage and data directories
RUN mkdir -p /app/storage /app/data && chown -R nextjs:nodejs /app/storage /app/data && chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Use entrypoint script for migrations and startup
ENTRYPOINT ["./docker-entrypoint.sh"]

