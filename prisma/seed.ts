/**
 * Сиды: администратор и справочники.
 *
 * Выдуманных объектов здесь нет сознательно. Агентство заводит свои, а
 * фальшивые карточки в базе, из которой потом уйдут ссылки клиентам, — прямой
 * путь к тому, чтобы кто-то отправил покупателю несуществующую квартиру.
 *
 * Запуск: npm run db:seed
 */

import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

if (existsSync(".env")) process.loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString === "") {
  throw new Error("DATABASE_URL не задан");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Справочники под объекты в России. Остальное админ добавит по мере работы. */
const REFERENCES: readonly {
  readonly city: string;
  readonly districts: readonly string[];
}[] = [
  {
    city: "Москва",
    districts: [
      "Центральный",
      "Северный",
      "Северо-Восточный",
      "Восточный",
      "Юго-Восточный",
      "Южный",
      "Юго-Западный",
      "Западный",
      "Северо-Западный",
      "Новомосковский",
    ],
  },
  {
    city: "Санкт-Петербург",
    districts: [
      "Адмиралтейский",
      "Василеостровский",
      "Выборгский",
      "Калининский",
      "Кировский",
      "Московский",
      "Невский",
      "Петроградский",
      "Приморский",
      "Центральный",
    ],
  },
];

async function seedReferences(): Promise<void> {
  for (const entry of REFERENCES) {
    const city = await prisma.city.upsert({
      where: { name: entry.city },
      update: {},
      create: { name: entry.city },
      select: { id: true },
    });

    for (const districtName of entry.districts) {
      await prisma.district.upsert({
        where: { cityId_name: { cityId: city.id, name: districtName } },
        update: {},
        create: { cityId: city.id, name: districtName },
      });
    }
  }
}

/**
 * Пароль берётся из окружения, иначе генерируется и печатается один раз. Второй
 * возможности его увидеть не будет — в базе лежит только хеш.
 */
async function seedAdmin(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? "admin@agency.local").toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (existing !== null && existing.passwordHash !== null) {
    console.log(`Администратор уже есть: ${email}`);
    return;
  }

  const fromEnv = process.env.ADMIN_PASSWORD;
  const password = fromEnv ?? randomBytes(12).toString("base64url");

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash: await hashPassword(password), role: "ADMIN", isActive: true },
    create: {
      email,
      name: process.env.ADMIN_NAME ?? "Администратор",
      role: "ADMIN",
      isActive: true,
      passwordHash: await hashPassword(password),
    },
  });

  console.log(`Администратор создан: ${email}`);
  if (fromEnv === undefined) {
    console.log(`Пароль (показывается один раз): ${password}`);
  }
}

async function main(): Promise<void> {
  await seedReferences();
  await seedAdmin();

  const [cities, districts] = await Promise.all([
    prisma.city.count(),
    prisma.district.count(),
  ]);
  console.log(`Справочники: городов ${cities}, районов ${districts}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
