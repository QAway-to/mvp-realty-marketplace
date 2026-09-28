/**
 * Чтение каталога. Единственная точка, через которую страницы получают объекты.
 *
 * Пока Postgres не поднят, источником служат демо-данные: включается флагом
 * `USE_DEMO_DATA`. Флаг явный, а не «база не отвечает — покажем заглушку»:
 * молчаливый откат на выдуманные объекты в приложении для риэлторов — худшее,
 * что может случиться, потому что отличить его от настоящей выдачи нельзя.
 */

import { queryDemo } from "./demo-data";
import {
  buildOrderBy,
  buildPagination,
  buildWhere,
  type Filters,
} from "./filters";
import type { PropertyCardView, PropertyPage } from "./property-view";

export const isDemoMode = (): boolean => process.env.USE_DEMO_DATA === "1";

/**
 * Явный список полей вместо `include`: внутренние поля объекта — комиссия,
 * номер квартиры, заметки — не должны попасть в браузер даже случайно, и
 * надёжнее всего это гарантирует выборка, которая их не запрашивает.
 */
const CARD_SELECT = {
  id: true,
  title: true,
  dealType: true,
  price: true,
  pricePerSqm: true,
  areaTotal: true,
  rooms: true,
  floor: true,
  floorsTotal: true,
  street: true,
  hasTour: true,
  imagesCount: true,
  district: { select: { name: true } },
  complex: { select: { name: true } },
  images: {
    where: { isCover: true },
    select: { storageKey: true },
    take: 1,
  },
} as const;

type CardRow = {
  readonly id: string;
  readonly title: string;
  readonly dealType: "SALE" | "RENT";
  readonly price: bigint | null;
  readonly pricePerSqm: number | null;
  readonly areaTotal: number | null;
  readonly rooms: number | null;
  readonly floor: number | null;
  readonly floorsTotal: number | null;
  readonly street: string | null;
  readonly hasTour: boolean;
  readonly imagesCount: number;
  readonly district: { readonly name: string } | null;
  readonly complex: { readonly name: string } | null;
  readonly images: readonly { readonly storageKey: string }[];
};

const toCardView = (row: CardRow): PropertyCardView => ({
  id: row.id,
  title: row.title,
  dealType: row.dealType,
  // Цена в базе BigInt ради больших коммерческих сумм, в браузер уходит числом:
  // BigInt не сериализуется, а рублёвые суммы в Number укладываются с запасом.
  // null остаётся null: «цена не указана» и «ноль рублей» — разные вещи.
  price: row.price === null ? null : Number(row.price),
  pricePerSqm: row.pricePerSqm,
  areaTotal: row.areaTotal,
  rooms: row.rooms,
  floor: row.floor,
  floorsTotal: row.floorsTotal,
  districtName: row.district?.name ?? null,
  complexName: row.complex?.name ?? null,
  street: row.street,
  hasTour: row.hasTour,
  imagesCount: row.imagesCount,
  coverUrl: row.images[0]?.storageKey ?? null,
});

export type PropertyDetail = PropertyCardView & {
  readonly description: string | null;
  readonly parking: boolean;
  readonly status: string;
  readonly tourSourceUrl: string | null;
};

/**
 * Кому предназначено чтение. Параметр обязателен сознательно: выбор нельзя
 * забыть, а значение по умолчанию однажды оказалось бы «показать всё».
 */
export type PropertyAudience = "staff" | "client";

/**
 * Статусы, которые допустимо показывать клиенту по ссылке. Черновик, снятый,
 * проданный и сданный объект наружу не уходят: агент завёл их для себя, а не
 * для показа.
 */
const CLIENT_VISIBLE_STATUSES = ["ACTIVE", "RESERVED"] as const;

/**
 * Один объект для карточки. Внутренние поля не запрашиваются: эта же выборка
 * поедет на публичную страницу для клиента.
 *
 * Для `client` добавляется фильтр по статусу публикации. Одного `deletedAt` не
 * хватает: без этого условия любой, кто угадал или получил идентификатор, видел
 * бы черновики и снятые объекты с ценой и адресом.
 */
export async function getProperty(
  id: string,
  audience: PropertyAudience,
): Promise<PropertyDetail | null> {
  const { getPrisma } = await import("./prisma");

  const row = await getPrisma().property.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(audience === "client"
        ? {
            status: { in: [...CLIENT_VISIBLE_STATUSES] },
            publishedAt: { not: null },
          }
        : {}),
    },
    select: {
      ...CARD_SELECT,
      description: true,
      parking: true,
      status: true,
      tours: { select: { sourceUrl: true }, take: 1 },
    },
  });

  if (row === null) return null;

  return {
    ...toCardView(row),
    description: row.description,
    parking: row.parking,
    status: row.status,
    tourSourceUrl: row.tours[0]?.sourceUrl ?? null,
  };
}

export async function listProperties(filters: Filters): Promise<PropertyPage> {
  const { skip, take } = buildPagination(filters);

  if (isDemoMode()) {
    return queryDemo(filters, skip, take);
  }

  const { getPrisma } = await import("./prisma");
  const prisma = getPrisma();
  const where = buildWhere(filters);

  // Список и счётчик — одной транзакцией: иначе «найдено N» и сама выдача
  // расходятся, когда кто-то правит объект между двумя запросами.
  const [rows, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      orderBy: buildOrderBy(filters),
      select: CARD_SELECT,
      skip,
      take,
    }),
    prisma.property.count({ where }),
  ]);

  return { items: rows.map(toCardView), total };
}
