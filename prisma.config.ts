import { existsSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

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

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
