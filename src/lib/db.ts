import { PrismaClient } from '../generated/prisma/client';

// Prevent multiple instances in Next.js dev hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.ACCELERATE_URL,
      },
    },
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  } as any);
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
