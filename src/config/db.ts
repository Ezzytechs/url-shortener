import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prevent multiple instances of Prisma Client in development due to hot-reloading
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const databaseUrl = process.env.DATABASE_URL;

let prisma: PrismaClient;

if (!databaseUrl) {
  const stubPrisma: any = {
    link: {
      deleteMany: async () => ({}),
      findUnique: async () => null,
      create: async () => {
        throw new Error("Prisma not configured");
      },
      delete: async () => {
        throw new Error("Prisma not configured");
      },
      findMany: async () => [],
    },
    clickAnalytic: {
      create: async () => {
        throw new Error("Prisma not configured");
      },
    },
    $disconnect: async () => {},
  };

  prisma = stubPrisma as unknown as PrismaClient;
} else {
  prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
      adapter: new PrismaPg(databaseUrl),
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
}

export { prisma };
