import { PrismaClient } from "@prisma/client";

// Prevents creating a new Prisma Client on every hot-reload in dev,
// and keeps a single pooled connection per serverless instance in prod.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
