/**
 * Демо-данные на время, пока не поднят Postgres.
 *
 * Нужны, чтобы каталог и фильтры можно было открыть и потрогать до того, как
 * появится база. Как только в окружении есть `DATABASE_URL`, каталог читает
 * Postgres, а этот файл и матчер под ним удаляются одним движением —
 * см. `properties.ts`.
 */

import type { Filters } from "./filters";
import type { PropertyCardView } from "./property-view";

type DemoProperty = PropertyCardView & {
  readonly propertyType: "apartment" | "house" | "land" | "commercial";
  readonly districtId: string;
  readonly isLastFloor: boolean;
  readonly parking: boolean;
  readonly createdAt: number;
};

const make = (
  id: string,
  title: string,
  price: number,
  areaTotal: number,
  rooms: number | null,
  floor: number | null,
  floorsTotal: number | null,
  districtId: string,
  districtName: string,
  complexName: string | null,
  street: string,
  hasTour: boolean,
  imagesCount: number,
  propertyType: DemoProperty["propertyType"],
  parking: boolean,
  createdAt: number,
): DemoProperty => ({
  id,
  title,
  dealType: "SALE",
  price,
  pricePerSqm: Math.round(price / areaTotal),
  areaTotal,
  rooms,
  floor,
  floorsTotal,
  districtId,
  districtName,
  complexName,
  street,
  hasTour,
  imagesCount,
  coverUrl: null,
  propertyType,
  isLastFloor: floor !== null && floor === floorsTotal,
  parking,
  createdAt,
});

export const DEMO_DISTRICTS = [
  { id: "d-center", name: "Центральный" },
  { id: "d-west", name: "Западный" },
  { id: "d-north", name: "Северный" },
  { id: "d-park", name: "Парковый" },
] as const;

export const DEMO_PROPERTIES: readonly DemoProperty[] = [
  make("p-01", "Студия с панорамным окном", 8_900_000, 28.4, 0, 7, 24, "d-center", "Центральный", "Небо", "Ленинская, 14", true, 8, "apartment", true, 20),
  make("p-02", "Двушка в свежей сдаче", 14_200_000, 58.1, 2, 12, 17, "d-west", "Западный", "Морская гавань", "Приморская, 3", true, 12, "apartment", true, 19),
  make("p-03", "Трёшка с видом на парк", 19_750_000, 84.6, 3, 5, 9, "d-park", "Парковый", "Зелёный квартал", "Садовая, 21", true, 15, "apartment", true, 18),
  make("p-04", "Однушка под ремонт", 6_400_000, 34.0, 1, 1, 5, "d-north", "Северный", null, "Заводская, 8", false, 4, "apartment", false, 17),
  make("p-05", "Квартира на последнем этаже", 11_300_000, 47.2, 2, 9, 9, "d-north", "Северный", "Высота", "Мира, 45", false, 6, "apartment", true, 16),
  make("p-06", "Просторная четырёшка", 26_900_000, 112.3, 4, 3, 8, "d-center", "Центральный", "Дом на Ленинской", "Ленинская, 2", true, 18, "apartment", true, 15),
  make("p-07", "Пятикомнатная с террасой", 41_500_000, 168.0, 5, 6, 6, "d-park", "Парковый", "Зелёный квартал", "Садовая, 25", true, 22, "apartment", true, 14),
  make("p-08", "Дом с участком 8 соток", 23_400_000, 146.5, 4, null, null, "d-west", "Западный", null, "Дачная, 12", true, 14, "house", true, 13),
  make("p-09", "Коттедж у воды", 34_800_000, 210.0, 5, null, null, "d-west", "Западный", "Морская гавань", "Береговая, 4", false, 9, "house", true, 12),
  make("p-10", "Участок под застройку", 4_900_000, 1000.0, null, null, null, "d-north", "Северный", null, "Полевая, 77", false, 3, "land", false, 11),
  make("p-11", "Помещение под кафе", 17_200_000, 96.0, null, 1, 12, "d-center", "Центральный", null, "Ленинская, 30", true, 7, "commercial", false, 10),
  make("p-12", "Двушка с лоджией", 12_800_000, 54.7, 2, 4, 16, "d-park", "Парковый", "Небо", "Садовая, 9", false, 5, "apartment", true, 9),
  make("p-13", "Студия в новом доме", 7_650_000, 25.9, 0, 15, 22, "d-west", "Западный", "Морская гавань", "Приморская, 5", true, 10, "apartment", true, 8),
  make("p-14", "Трёшка в кирпичном доме", 16_400_000, 78.3, 3, 2, 5, "d-north", "Северный", null, "Мира, 12", false, 6, "apartment", false, 7),
  make("p-15", "Однушка рядом с парком", 8_100_000, 38.5, 1, 6, 10, "d-park", "Парковый", "Зелёный квартал", "Садовая, 3", true, 11, "apartment", true, 6),
  make("p-16", "Четырёшка с кабинетом", 29_300_000, 124.8, 4, 8, 14, "d-center", "Центральный", "Дом на Ленинской", "Ленинская, 6", true, 16, "apartment", true, 5),
];

/**
 * Тот же фильтр, что `buildWhere` выражает для Postgres, только по массиву.
 * Живёт ровно до появления базы — держать две реализации одного правила дольше
 * незачем.
 */
const matches = (property: DemoProperty, filters: Filters): boolean => {
  if (property.dealType !== filters.deal.toUpperCase()) return false;
  if (filters.type && !filters.type.includes(property.propertyType)) return false;

  if (filters.priceMin !== undefined && property.price < filters.priceMin) return false;
  if (filters.priceMax !== undefined && property.price > filters.priceMax) return false;

  if (filters.ppsMin !== undefined && (property.pricePerSqm ?? 0) < filters.ppsMin) return false;
  if (filters.ppsMax !== undefined && (property.pricePerSqm ?? 0) > filters.ppsMax) return false;

  if (filters.areaMin !== undefined && property.areaTotal < filters.areaMin) return false;
  if (filters.areaMax !== undefined && property.areaTotal > filters.areaMax) return false;

  if (filters.rooms) {
    const exact = filters.rooms.filter((token) => token !== "4plus").map(Number);
    const andMore = filters.rooms.includes("4plus");
    const rooms = property.rooms;
    const fits =
      rooms !== null && (exact.includes(rooms) || (andMore && rooms >= 4));
    if (!fits) return false;
  }

  if (filters.floorMin !== undefined && (property.floor ?? 0) < filters.floorMin) return false;
  if (filters.floorMax !== undefined && (property.floor ?? 0) > filters.floorMax) return false;
  if (filters.notFirst && (property.floor ?? 0) <= 1) return false;
  if (filters.lastOnly && !property.isLastFloor) return false;
  if (!filters.lastOnly && filters.notLast && property.isLastFloor) return false;

  if (filters.district && !filters.district.includes(property.districtId)) return false;
  if (filters.parking && !property.parking) return false;
  if (filters.tour && !property.hasTour) return false;
  if (filters.photo && property.imagesCount === 0) return false;

  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const haystack = [property.title, property.street, property.complexName]
      .filter((value): value is string => value !== null)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
};

const SORTERS: Record<Filters["sort"], (a: DemoProperty, b: DemoProperty) => number> = {
  created_desc: (a, b) => b.createdAt - a.createdAt,
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  pps_asc: (a, b) => (a.pricePerSqm ?? 0) - (b.pricePerSqm ?? 0),
  pps_desc: (a, b) => (b.pricePerSqm ?? 0) - (a.pricePerSqm ?? 0),
  area_desc: (a, b) => b.areaTotal - a.areaTotal,
};

export const queryDemo = (filters: Filters, skip: number, take: number) => {
  const found = DEMO_PROPERTIES.filter((property) => matches(property, filters));
  const sorted = [...found].sort(SORTERS[filters.sort]);
  return { items: sorted.slice(skip, skip + take), total: found.length };
};

/**
 * Ссылки на публичные демо-туры Matterport и Kuula. Проходят через тот же
 * `parseTourUrl`, что и всё остальное: демо-данные не повод обходить валидацию.
 *
 * Каждый идентификатор проверен запросом — модель отвечает 200 и открывается.
 * Выдуманный ID выглядит в коде совершенно так же, как настоящий, а ломается
 * только в браузере словами «модель недоступна», поэтому новые ссылки сюда
 * добавляем, сперва открыв их.
 */
export const DEMO_TOURS: Readonly<Record<string, string>> = {
  "p-01": "https://my.matterport.com/show/?m=SxQL3iGyoDo",
  "p-02": "https://kuula.co/share/collection/7l8Qn",
  "p-03": "https://my.matterport.com/show/?m=SxQL3iGyoDo",
  "p-06": "https://my.matterport.com/show/?m=SxQL3iGyoDo",
  "p-07": "https://kuula.co/share/7ZFsh",
  "p-08": "https://kuula.co/share/7ZFsh",
  "p-11": "https://kuula.co/share/7ZFsh",
  "p-13": "https://my.matterport.com/show/?m=SxQL3iGyoDo",
  "p-15": "https://kuula.co/share/collection/7l8Qn",
  "p-16": "https://kuula.co/share/collection/7l8Qn",
};

export const findDemoProperty = (id: string) =>
  DEMO_PROPERTIES.find((property) => property.id === id) ?? null;
