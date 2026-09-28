import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 больше не принимает `url` в schema.prisma: строка подключения живёт
 * здесь, а клиент в рантайме получает адаптер. Схема остаётся чистым описанием
 * данных, без секретов внутри.
 *
 * `.env` он тоже больше не читает сам, поэтому подгружаем файл штатным
 * средством Node — отдельная зависимость ради этого не нужна. На Render файла
 * нет, переменные приходят из окружения, поэтому чтение условное.
 */
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

const connectionString = process.env.DATABASE_URL;

/**
 * `datasource` подставляем только когда строка подключения действительно есть.
 * `generate` в базу не ходит, и первая сборка на Render не должна падать лишь
 * потому, что Postgres к сервису ещё не привязали. Команды миграций без
 * `DATABASE_URL` скажут об этом сами.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  ...(connectionString !== undefined && connectionString !== ""
    ? { datasource: { url: connectionString } }
    : {}),
});
