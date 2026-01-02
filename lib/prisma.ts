/**
 * Prisma Client Singleton
 * 
 * This module provides a singleton instance of the Prisma Client to prevent
 * multiple instances in development (which can cause connection issues).
 * 
 * In production, this ensures efficient database connection pooling.
 */

import { PrismaClient } from '@prisma/client'

// Global variable to store the Prisma Client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create a single Prisma Client instance, reusing it if it already exists
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// In development, store the instance globally to prevent multiple instances
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
