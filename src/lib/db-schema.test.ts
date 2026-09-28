import { describe, expect, it } from "vitest";

import { withSchema } from "./db-schema";

const BASE = "postgresql://user:secret@db.internal:5432/realty";

describe("схема в строке подключения", () => {
  it("добавляет схему, когда её не было", () => {
    expect(withSchema(BASE, "realty")).toContain("schema=realty");
  });

  it("перезаписывает public: забытый в окружении, он разложил бы таблицы в общую схему", () => {
    const result = withSchema(`${BASE}?schema=public`, "realty");

    expect(result).toContain("schema=realty");
    expect(result).not.toContain("schema=public");
  });

  it("сохраняет пользователя, пароль, хост и базу", () => {
    const url = new URL(withSchema(BASE, "realty"));

    expect(url.username).toBe("user");
    expect(url.password).toBe("secret");
    expect(url.hostname).toBe("db.internal");
    expect(url.port).toBe("5432");
    expect(url.pathname).toBe("/realty");
  });

  it("не теряет остальные параметры подключения", () => {
    const result = withSchema(
      `${BASE}?sslmode=require&connection_limit=5`,
      "realty",
    );

    expect(result).toContain("sslmode=require");
    expect(result).toContain("connection_limit=5");
    expect(result).toContain("schema=realty");
  });

  it("не плодит второй параметр schema при повторном применении", () => {
    const once = withSchema(BASE, "realty");
    const twice = withSchema(once, "realty");

    expect(twice).toBe(once);
    expect(twice.match(/schema=/g)).toHaveLength(1);
  });
});
