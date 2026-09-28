import { describe, expect, it } from "vitest";

import {
  buildOrderBy,
  buildPagination,
  buildWhere,
  PAGE_SIZE,
  parseFilters,
  type Filters,
} from "./filters";

const parse = (query: string): Filters => {
  const result = parseFilters(new URLSearchParams(query));
  if (!result.ok) throw new Error(`не разобралось: ${result.errors.join(", ")}`);
  return result.filters;
};

/** Условия внутри AND ищем по ключу — порядок сборки не часть контракта. */
const clauses = (filters: Filters) =>
  buildWhere(filters).AND as readonly Record<string, unknown>[];

const clauseWith = (filters: Filters, key: string) =>
  clauses(filters).find((clause) => key in clause);

describe("parseFilters: значения по умолчанию", () => {
  it("пустой запрос — это продажа, активные, сначала новые, первая страница", () => {
    const filters = parse("");

    expect(filters.deal).toBe("sale");
    expect(filters.sort).toBe("created_desc");
    expect(filters.page).toBe(1);
    expect(filters.status).toBeUndefined();
  });

  it("пустой фильтр ограничивает выдачу активными, а не отдаёт всю таблицу", () => {
    expect(clauseWith(parse(""), "status")).toEqual({ status: { in: ["ACTIVE"] } });
  });

  it("мягко удалённые объекты не возвращаются никогда", () => {
    expect(clauseWith(parse("deal=rent"), "deletedAt")).toEqual({ deletedAt: null });
  });
});

describe("parseFilters: разбор значений", () => {
  it("читает мультивыбор из списка через запятую", () => {
    expect(parse("type=apartment,house").type).toEqual(["apartment", "house"]);
  });

  it("не обращает внимания на регистр и пробелы в мультивыборе", () => {
    expect(parse("type= Apartment , HOUSE ").type).toEqual(["apartment", "house"]);
  });

  it("принимает флаг только как 1 или true", () => {
    expect(parse("tour=1").tour).toBe(true);
    expect(parse("tour=true").tour).toBe(true);
  });

  it("считает пустой параметр отсутствующим", () => {
    expect(parse("priceMin=&q=").priceMin).toBeUndefined();
  });

  it("молча игнорирует неизвестные параметры", () => {
    const result = parseFilters(new URLSearchParams("utm_source=mail&hz=1"));
    expect(result.ok).toBe(true);
  });

  it("читает searchParams страницы Next, а не только URLSearchParams", () => {
    const result = parseFilters({ deal: "rent", rooms: "2,3" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filters.deal).toBe("rent");
    expect(result.filters.rooms).toEqual(["2", "3"]);
  });
});

describe("parseFilters: ошибки видны", () => {
  it("не принимает нечисловую цену", () => {
    const result = parseFilters(new URLSearchParams("priceMin=abc"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain("priceMin");
  });

  it("не принимает неизвестный тип объекта", () => {
    expect(parseFilters(new URLSearchParams("type=yacht")).ok).toBe(false);
  });

  it("не принимает неизвестную сортировку", () => {
    expect(parseFilters(new URLSearchParams("sort=price")).ok).toBe(false);
  });

  it("не принимает нулевую и отрицательную страницу", () => {
    expect(parseFilters(new URLSearchParams("page=0")).ok).toBe(false);
    expect(parseFilters(new URLSearchParams("page=-3")).ok).toBe(false);
  });

  it("не принимает флаг со произвольным значением", () => {
    expect(parseFilters(new URLSearchParams("tour=maybe")).ok).toBe(false);
  });
});

describe("buildWhere: комнаты", () => {
  it("не использует плюс в токене: в query string он стал бы пробелом", () => {
    expect(parseFilters(new URLSearchParams("rooms=4+")).ok).toBe(false);
  });

  it("разворачивает 4plus в «четыре и больше»", () => {
    const clause = clauseWith(parse("rooms=2,4plus"), "OR");

    expect(clause).toEqual({
      OR: [{ rooms: { in: [2] } }, { rooms: { gte: 4 } }],
    });
  });

  it("студию трактует как ноль комнат, а не как отсутствие значения", () => {
    expect(clauseWith(parse("rooms=0"), "OR")).toEqual({
      OR: [{ rooms: { in: [0] } }],
    });
  });
});

describe("buildWhere: этажи", () => {
  it("«не первый» — это этаж больше первого", () => {
    expect(clauseWith(parse("notFirst=1"), "floor")).toEqual({ floor: { gt: 1 } });
  });

  it("«не последний» опирается на готовую колонку, а не на сравнение колонок", () => {
    expect(clauseWith(parse("notLast=1"), "isLastFloor")).toEqual({
      isLastFloor: false,
    });
  });

  it("при конфликте «только последний» побеждает, а не складывается с «не последним»", () => {
    const found = clauses(parse("notLast=1&lastOnly=1")).filter(
      (clause) => "isLastFloor" in clause,
    );

    expect(found).toEqual([{ isLastFloor: true }]);
  });
});

describe("buildWhere: диапазоны и флаги", () => {
  it("собирает односторонний диапазон цены", () => {
    expect(clauseWith(parse("priceMax=9000000"), "price")).toEqual({
      price: { lte: 9_000_000n },
    });
  });

  it("собирает двусторонний диапазон площади", () => {
    expect(clauseWith(parse("areaMin=40&areaMax=80"), "areaTotal")).toEqual({
      areaTotal: { gte: 40, lte: 80 },
    });
  });

  it("«только с 3D-туром» читает денормализованный признак", () => {
    expect(clauseWith(parse("tour=1"), "hasTour")).toEqual({ hasTour: true });
  });

  it("«только с фото» требует хотя бы одну картинку", () => {
    expect(clauseWith(parse("photo=1"), "imagesCount")).toEqual({
      imagesCount: { gt: 0 },
    });
  });

  it("не добавляет условий для фильтров, которых нет в запросе", () => {
    expect(clauseWith(parse(""), "hasTour")).toBeUndefined();
    expect(clauseWith(parse(""), "price")).toBeUndefined();
  });
});

describe("buildWhere: текстовый поиск", () => {
  it("ищет по названию, улице и ЖК без учёта регистра", () => {
    expect(clauseWith(parse("q=садовая"), "OR")).toEqual({
      OR: [
        { title: { contains: "садовая", mode: "insensitive" } },
        { street: { contains: "садовая", mode: "insensitive" } },
        { complex: { name: { contains: "садовая", mode: "insensitive" } } },
      ],
    });
  });
});

describe("сортировка и страницы", () => {
  it("переводит токен сортировки в порядок выборки", () => {
    expect(buildOrderBy(parse("sort=pps_asc"))).toEqual({ pricePerSqm: "asc" });
    expect(buildOrderBy(parse(""))).toEqual({ createdAt: "desc" });
  });

  it("считает смещение от номера страницы", () => {
    expect(buildPagination(parse(""))).toEqual({ skip: 0, take: PAGE_SIZE });
    expect(buildPagination(parse("page=3"))).toEqual({
      skip: PAGE_SIZE * 2,
      take: PAGE_SIZE,
    });
  });
});
