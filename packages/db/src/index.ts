import { PrismaClient } from './generated/prisma'

// Singleton pattern — prevents multiple connections in Next.js dev hot-reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Re-export all generated types so consumers import from @ziort/db
export * from './generated/prisma'
export type { PrismaClient }
