/**
 * Клиент Prisma. Один на процесс.
 *
 * В dev Next перезагружает модули на каждое изменение, поэтому без кеша в
 * `globalThis` пул соединений растёт до отказа базы. Prisma 7 подключается
 * через драйверный адаптер, строка подключения берётся из окружения.
 */

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { DATABASE_SCHEMA, withSchema } from "@/lib/db-schema";

const createClient = (): PrismaClient => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString === undefined || connectionString === "") {
    throw new Error(
      "DATABASE_URL не задан. Либо поднимите Postgres, либо включите демо-режим: USE_DEMO_DATA=1",
    );
  }

  // Схема задаётся и в строке подключения, и параметром адаптера: первое влияет
  // на search_path соединения, второе — на имена в генерируемых запросах.
  return new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: withSchema(connectionString) },
      { schema: DATABASE_SCHEMA },
    ),
  });
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
