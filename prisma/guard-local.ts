/**
 * Не даёт запустить `prisma migrate dev` по неместной базе.
 *
 * `migrate dev` — инструмент разработки: он умеет предлагать сброс базы и
 * создаёт теневую базу рядом. База на Render общая с другими проектами, и такой
 * команде там делать нечего. Для неё есть `db:deploy`, который только применяет
 * готовые миграции и ничего не сбрасывает.
 *
 * Запускается автоматически перед `db:migrate`.
 */

import { existsSync } from "node:fs";

if (existsSync(".env")) process.loadEnvFile(".env");

const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString === "") {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "host.docker.internal"]);

let hostname: string;
try {
  hostname = new URL(connectionString).hostname;
} catch {
  console.error("DATABASE_URL не разбирается как URL");
  process.exit(1);
}

if (!LOCAL_HOSTS.has(hostname)) {
  console.error(
    [
      `Отказ: DATABASE_URL указывает на ${hostname}, а не на локальную базу.`,
      "",
      "`migrate dev` умеет сбрасывать базу и создаёт теневую рядом — на общей",
      "базе это недопустимо. Чтобы применить миграции там, используйте:",
      "",
      "    npm run db:deploy",
      "",
      "Она только накатывает готовые миграции и ничего не удаляет.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`База локальная (${hostname}) — migrate dev разрешён`);
