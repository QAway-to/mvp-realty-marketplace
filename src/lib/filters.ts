/**
 * Фильтры каталога: разбор query string и сборка запроса к базе.
 *
 * Один парсер на всё — страницу выдачи, API и сохранённый поиск. Состояние
 * фильтров живёт только в URL, поэтому ссылку на выдачу можно переслать
 * коллеге, положить в закладки и сохранить как поиск, не заводя второй формат.
 *
 * Спецификация полей — docs/DOMAIN.md, раздел «Фильтры».
 */

import { z } from "zod";
import type { $Enums, Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 24;

const DEAL_TOKENS = ["sale", "rent"] as const;
const TYPE_TOKENS = ["apartment", "house", "land", "commercial"] as const;
const STATUS_TOKENS = [
  "draft",
  "active",
  "reserved",
  "sold",
  "rented",
  "withdrawn",
] as const;
const BUILDING_TOKENS = ["panel", "brick", "monolith", "block", "wood"] as const;
const RENOVATION_TOKENS = ["none", "cosmetic", "euro", "designer"] as const;
const BALCONY_TOKENS = ["none", "balcony", "loggia"] as const;

export const SORT_TOKENS = [
  "created_desc",
  "price_asc",
  "price_desc",
  "pps_asc",
  "pps_desc",
  "area_desc",
] as const;

export type SortToken = (typeof SORT_TOKENS)[number];

/**
 * Токены в URL пишутся в нижнем регистре ради читаемости ссылки, а в базе
 * лежат значения enum в верхнем. Соответствие ровно одно к одному, поэтому
 * отдельная таблица переводов была бы лишней сущностью.
 */
const toEnum = <T extends string>(token: string): T => token.toUpperCase() as T;

/** Пустой параметр — это отсутствующий параметр, а не нуль и не ошибка. */
const blankToUndefined = (raw: unknown) =>
  typeof raw === "string" && raw.trim() === "" ? undefined : raw;

const intParam = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().optional(),
);

const positiveIntParam = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().positive().optional(),
);

const floatParam = z.preprocess(
  blankToUndefined,
  z.coerce.number().positive().optional(),
);

/** Флаг либо есть и равен `1`, либо его нет. Прочее — ошибка, а не «нет». */
const flagParam = z.preprocess(
  blankToUndefined,
  z
    .enum(["1", "true"])
    .transform(() => true)
    .optional(),
);

/** Мультивыбор приезжает как `type=apartment,house`. */
const csvParam = <const T extends readonly [string, ...string[]]>(tokens: T) =>
  z.preprocess(
    (raw) =>
      typeof raw === "string"
        ? raw
            .split(",")
            .map((part) => part.trim().toLowerCase())
            .filter((part) => part !== "")
        : raw,
    z.array(z.enum(tokens)).nonempty().optional(),
  );

/** Район и ЖК приходят идентификаторами справочника, а не набором токенов. */
const csvIdsParam = z.preprocess(
  (raw) =>
    typeof raw === "string"
      ? raw
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "")
      : raw,
  z.array(z.string().min(1).max(64)).nonempty().optional(),
);

/**
 * «Четыре и больше» — не число, а отдельный случай. В URL он пишется как
 * `4plus`, а не `4+`: плюс в query string декодируется как пробел, и ссылка,
 * которую кто-то поправил руками, молча теряла бы фильтр.
 */
const roomsParam = z.preprocess(
  (raw) =>
    typeof raw === "string"
      ? raw
          .split(",")
          .map((part) => part.trim())
          .filter((part) => part !== "")
      : raw,
  z.array(z.enum(["0", "1", "2", "3", "4plus"])).nonempty().optional(),
);

const filtersSchema = z.object({
  deal: z.enum(DEAL_TOKENS).default("sale"),
  type: csvParam(TYPE_TOKENS),
  status: csvParam(STATUS_TOKENS),

  priceMin: intParam,
  priceMax: intParam,
  ppsMin: intParam,
  ppsMax: intParam,
  areaMin: floatParam,
  areaMax: floatParam,

  rooms: roomsParam,
  floorMin: positiveIntParam,
  floorMax: positiveIntParam,
  notFirst: flagParam,
  notLast: flagParam,
  lastOnly: flagParam,

  district: csvIdsParam,
  complex: csvIdsParam,

  building: csvParam(BUILDING_TOKENS),
  builtFrom: positiveIntParam,
  builtTo: positiveIntParam,
  renovation: csvParam(RENOVATION_TOKENS),
  bathMin: positiveIntParam,
  balcony: csvParam(BALCONY_TOKENS),
  parking: flagParam,

  tour: flagParam,
  photo: flagParam,

  agent: z.string().min(1).optional(),
  q: z.preprocess(blankToUndefined, z.string().min(2).max(120).optional()),

  sort: z.enum(SORT_TOKENS).default("created_desc"),
  page: z.preprocess(blankToUndefined, z.coerce.number().int().positive().default(1)),
});

export type Filters = z.infer<typeof filtersSchema>;

export type FilterParseResult =
  | { readonly ok: true; readonly filters: Filters }
  | { readonly ok: false; readonly errors: readonly string[] };

/** Что приезжает в `searchParams` страницы Next или из `URLSearchParams`. */
export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

/**
 * Неизвестные параметры отбрасываются молча, некорректные значения — ошибка.
 * Разница осмысленная: мусор в пересланной ссылке не должен ломать выдачу, а
 * `priceMin=abc` должен быть виден, иначе агент решит, что фильтр применился.
 */
export function parseFilters(raw: RawSearchParams): FilterParseResult {
  const entries =
    raw instanceof URLSearchParams
      ? [...raw.entries()]
      : Object.entries(raw).map(
          ([key, value]) =>
            [key, Array.isArray(value) ? (value[0] ?? "") : (value ?? "")] as const,
        );

  const parsed = filtersSchema.safeParse(Object.fromEntries(entries));
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (issue) => `${issue.path.join(".") || "query"}: ${issue.message}`,
      ),
    };
  }

  return { ok: true, filters: parsed.data };
}

const range = <T>(min: T | undefined, max: T | undefined) => ({
  ...(min !== undefined ? { gte: min } : {}),
  ...(max !== undefined ? { lte: max } : {}),
});

const hasRange = (min: unknown, max: unknown) =>
  min !== undefined || max !== undefined;

function roomsClause(
  tokens: NonNullable<Filters["rooms"]>,
): Prisma.PropertyWhereInput {
  const exact = tokens
    .filter((token) => token !== "4plus")
    .map((token) => Number(token));
  const andMore = tokens.includes("4plus");

  return {
    OR: [
      ...(exact.length > 0 ? [{ rooms: { in: exact } }] : []),
      ...(andMore ? [{ rooms: { gte: 4 } }] : []),
    ],
  };
}

/**
 * «Не последний этаж» — это сравнение двух колонок, которое Prisma не выражает
 * и индекс не ускоряет. Поэтому в базе лежит готовый `isLastFloor`.
 *
 * `lastOnly` и `notLast` взаимоисключающи: при обоих флагах берём `lastOnly`, а
 * противоречивое условие не собираем — иначе выдача молча опустеет.
 */
function floorClauses(filters: Filters): readonly Prisma.PropertyWhereInput[] {
  const lastFloor = filters.lastOnly
    ? [{ isLastFloor: true }]
    : filters.notLast
      ? [{ isLastFloor: false }]
      : [];

  return [
    ...(hasRange(filters.floorMin, filters.floorMax)
      ? [{ floor: range(filters.floorMin, filters.floorMax) }]
      : []),
    ...(filters.notFirst ? [{ floor: { gt: 1 } }] : []),
    ...lastFloor,
  ];
}

function searchClause(query: string): Prisma.PropertyWhereInput {
  const contains = { contains: query, mode: "insensitive" } as const;
  return {
    OR: [
      { title: contains },
      { street: contains },
      { complex: { name: contains } },
    ],
  };
}

/**
 * Пустой фильтр — это «активные объекты на продажу», а не все строки таблицы.
 * Мягко удалённые объекты не возвращаются никогда.
 */
export function buildWhere(filters: Filters): Prisma.PropertyWhereInput {
  const clauses: readonly (Prisma.PropertyWhereInput | undefined)[] = [
    { deletedAt: null },
    { dealType: toEnum<$Enums.DealType>(filters.deal) },
    {
      status: {
        in: (filters.status ?? ["active"]).map((token) =>
          toEnum<$Enums.PropertyStatus>(token),
        ),
      },
    },
    filters.type
      ? {
          propertyType: {
            in: filters.type.map((token) => toEnum<$Enums.PropertyType>(token)),
          },
        }
      : undefined,
    hasRange(filters.priceMin, filters.priceMax)
      ? {
          price: range(
            filters.priceMin !== undefined ? BigInt(filters.priceMin) : undefined,
            filters.priceMax !== undefined ? BigInt(filters.priceMax) : undefined,
          ),
        }
      : undefined,
    hasRange(filters.ppsMin, filters.ppsMax)
      ? { pricePerSqm: range(filters.ppsMin, filters.ppsMax) }
      : undefined,
    hasRange(filters.areaMin, filters.areaMax)
      ? { areaTotal: range(filters.areaMin, filters.areaMax) }
      : undefined,
    filters.rooms ? roomsClause(filters.rooms) : undefined,
    ...floorClauses(filters),
    filters.district ? { districtId: { in: filters.district } } : undefined,
    filters.complex ? { complexId: { in: filters.complex } } : undefined,
    filters.building
      ? {
          buildingType: {
            in: filters.building.map((token) =>
              toEnum<$Enums.BuildingType>(token),
            ),
          },
        }
      : undefined,
    hasRange(filters.builtFrom, filters.builtTo)
      ? { builtYear: range(filters.builtFrom, filters.builtTo) }
      : undefined,
    filters.renovation
      ? {
          renovation: {
            in: filters.renovation.map((token) =>
              toEnum<$Enums.Renovation>(token),
            ),
          },
        }
      : undefined,
    filters.bathMin !== undefined
      ? { bathrooms: { gte: filters.bathMin } }
      : undefined,
    filters.balcony
      ? {
          balcony: {
            in: filters.balcony.map((token) => toEnum<$Enums.BalconyType>(token)),
          },
        }
      : undefined,
    filters.parking ? { parking: true } : undefined,
    filters.tour ? { hasTour: true } : undefined,
    filters.photo ? { imagesCount: { gt: 0 } } : undefined,
    filters.agent ? { ownerId: filters.agent } : undefined,
    filters.q ? searchClause(filters.q) : undefined,
  ];

  return {
    AND: clauses.filter(
      (clause): clause is Prisma.PropertyWhereInput => clause !== undefined,
    ),
  };
}

const ORDER_BY: Readonly<
  Record<SortToken, Prisma.PropertyOrderByWithRelationInput>
> = {
  created_desc: { createdAt: "desc" },
  price_asc: { price: "asc" },
  price_desc: { price: "desc" },
  pps_asc: { pricePerSqm: "asc" },
  pps_desc: { pricePerSqm: "desc" },
  area_desc: { areaTotal: "desc" },
};

export const buildOrderBy = (
  filters: Filters,
): Prisma.PropertyOrderByWithRelationInput => ORDER_BY[filters.sort];

export const buildPagination = (filters: Filters) => ({
  skip: (filters.page - 1) * PAGE_SIZE,
  take: PAGE_SIZE,
});
