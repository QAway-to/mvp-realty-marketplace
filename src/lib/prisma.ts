/**
 * Клиент Prisma. Один на процесс.
 *
 * В dev Next перезагружает модули на каждое изменение, поэтому без кеша в
 * `globalThis` пул соединений растёт до отказа базы. Prisma 7 подключается
 * через драйверный адаптер, строка подключения берётся из окружения.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const createClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    throw new Error(
      "DATABASE_URL не задан. Либо поднимите Postgres, либо включите демо-режим: USE_DEMO_DATA=1",
    );
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
};

const globalForPrisma = globalThis as typeof globalThis & {
  prismaClient?: PrismaClient;
};

export const getPrisma = (): PrismaClient => {
  const existing = globalForPrisma.prismaClient;
  if (existing !== undefined) return existing;

  const client = createClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClient = client;
  }
  return client;
};
