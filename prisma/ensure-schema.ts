/**
 * Создаёт схему приложения, если её ещё нет.
 *
 * Отдельный шаг перед миграциями: Prisma рассчитывает, что схема из строки
 * подключения существует, а на общей базе её никто заранее не создаёт. Команда
 * идемпотентна — `IF NOT EXISTS`, ничего не удаляет и не переносит.
 *
 * Запуск: npm run db:setup (и автоматически перед db:migrate / db:deploy)
 */

import { existsSync } from "node:fs";

import { Client } from "pg";

import { DATABASE_SCHEMA } from "../src/lib/db-schema";

if (existsSync(".env")) process.loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString === "") {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

/**
 * Имя схемы попадает в DDL, а параметризовать идентификаторы нельзя. Поэтому
 * проверяем его формат сами и только потом подставляем в запрос.
 */
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(DATABASE_SCHEMA)) {
  console.error(
    `Недопустимое имя схемы: ${DATABASE_SCHEMA}. Ожидаются строчные буквы, цифры и подчёркивание.`,
  );
  process.exit(1);
}

const client = new Client({ connectionString, connectionTimeoutMillis: 15_000 });

async function main(): Promise<void> {
  await client.connect();

  const before = await client.query<{ exists: boolean }>(
    "select exists(select 1 from pg_namespace where nspname = $1) as exists",
    [DATABASE_SCHEMA],
  );

  if (before.rows[0]?.exists === true) {
    const tables = await client.query<{ count: string }>(
      "select count(*)::text as count from information_schema.tables where table_schema = $1",
      [DATABASE_SCHEMA],
    );
    console.log(
      `Схема "${DATABASE_SCHEMA}" уже есть, таблиц в ней: ${tables.rows[0]?.count ?? "?"}`,
    );
    return;
  }

  await client.query(`CREATE SCHEMA IF NOT EXISTS "${DATABASE_SCHEMA}"`);
  console.log(`Схема "${DATABASE_SCHEMA}" создана`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => {
    void client.end();
  });
