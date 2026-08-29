import { PrismaClient } from "@prisma/client";

/**
 * Lazily-created PrismaClient singleton.
 *
 * The client is built the first time it is requested, reading DATABASE_URL from
 * the environment at that moment. This lets tests point the client at a temporary
 * SQLite file before any code touches the database (see backend/src/tests/persistence.test.ts).
 *
 * Development URL: file:./dev.db (relative to prisma/schema.prisma) → backend/prisma/dev.db.
 * Production switches the schema provider to postgresql and points DATABASE_URL at Postgres.
 */

let prisma: PrismaClient | undefined;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

/** Disconnect and drop the cached instance so a new DATABASE_URL can take effect. */
export async function resetPrismaForTests(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = undefined;
  }
}
