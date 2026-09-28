/**
 * Демо-данные на время, пока не поднят Postgres.
 *
 * Нужны, чтобы каталог и фильтры можно было открыть и потрогать до того, как
 * появится база. Как только в окружении есть `DATABASE_URL`, каталог читает
 * Postgres, а этот файл и матчер под ним удаляются одним движением —
 * см. `properties.ts`.
 *
 * Десять объектов идут со своим 3D-туром Realsee, шесть — без тура, чтобы
 * фильтр «только с 3D-туром» было на чём проверять.
 */

import type { Filters } from "./filters";
import type { PropertyCardView } from "./property-view";

type DemoProperty = PropertyCardView & {
  // В демо-наборе цена и площадь заданы у всех — в отличие от черновиков в базе.
  readonly price: number;
  readonly areaTotal: number;
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
  // ─── С 3D-туром: у каждого свой, название согласовано с тем, что внутри ───
  make("p-01", "Апартаменты в Greenmount Residences", 18_400_000, 68.4, 2, 9, 18, "d-center", "Центральный", "Небо", "Ленинская, 14", true, 12, "apartment", true, 30),
  make("p-02", "Резиденция премиум-класса", 41_900_000, 118.0, 3, 14, 22, "d-center", "Центральный", "Дом на Ленинской", "Ленинская, 2", true, 18, "apartment", true, 29),
  make("p-03", "Квартира с дизайнерской отделкой", 16_200_000, 61.2, 2, 5, 12, "d-park", "Парковый", "Зелёный квартал", "Садовая, 21", true, 15, "apartment", true, 28),
  make("p-04", "Особняк у воды", 68_500_000, 214.0, 5, null, null, "d-west", "Западный", "Морская гавань", "Береговая, 4", true, 22, "house", true, 27),
  make("p-05", "Загородный дом с участком", 37_300_000, 168.5, 4, null, null, "d-west", "Западный", null, "Дачная, 12", true, 16, "house", true, 26),
  make("p-06", "Усадьба с парком", 94_000_000, 320.0, 6, null, null, "d-park", "Парковый", null, "Садовая, 40", true, 24, "house", true, 25),
  make("p-07", "Складской магазин", 52_600_000, 480.0, null, 1, 3, "d-north", "Северный", null, "Заводская, 18", true, 10, "commercial", true, 24),
  make("p-08", "Помещение под лёгкое производство", 61_200_000, 640.0, null, 1, 2, "d-north", "Северный", null, "Полевая, 5", true, 9, "commercial", true, 23),
  make("p-09", "Шоурум с ремонтной зоной", 44_800_000, 310.0, null, 1, 2, "d-west", "Западный", null, "Приморская, 30", true, 13, "commercial", true, 22),
  make("p-10", "Историческое здание под клуб", 88_700_000, 540.0, null, 1, 3, "d-center", "Центральный", null, "Ленинская, 30", true, 20, "commercial", false, 21),

  // ─── Без тура: фильтр «только с 3D-туром» должен их отсекать ───
  make("p-11", "Студия с панорамным окном", 8_900_000, 28.4, 0, 7, 24, "d-center", "Центральный", "Небо", "Ленинская, 14", false, 8, "apartment", true, 20),
  make("p-12", "Однушка под ремонт", 6_400_000, 34.0, 1, 1, 5, "d-north", "Северный", null, "Заводская, 8", false, 4, "apartment", false, 19),
  make("p-13", "Квартира на последнем этаже", 11_300_000, 47.2, 2, 9, 9, "d-north", "Северный", "Высота", "Мира, 45", false, 6, "apartment", true, 18),
  make("p-14", "Трёшка в кирпичном доме", 16_400_000, 78.3, 3, 2, 5, "d-north", "Северный", null, "Мира, 12", false, 6, "apartment", false, 17),
  make("p-15", "Четырёшка с кабинетом", 29_300_000, 124.8, 4, 8, 14, "d-center", "Центральный", "Дом на Ленинской", "Ленинская, 6", false, 11, "apartment", true, 16),
  make("p-16", "Участок под застройку", 4_900_000, 1000.0, null, null, null, "d-north", "Северный", null, "Полевая, 77", false, 3, "land", false, 15),
];

/**
 * По одному 3D-туру Realsee на объект, все десять разные.
 *
 * Каждая ссылка взята с сайта Realsee и проверена запросом: отвечает 200 и
 * открывается. Выдуманный код выглядит в коде точно так же, как настоящий, а
 * ломается только в браузере словами «модель недоступна», поэтому новые ссылки
 * сюда добавляем, сперва открыв их.
 *
 * В комментарии — что показывает тур. Название объекта должно соответствовать
 * тому, что клиент увидит внутри, иначе карточка выглядит подделкой.
 */
export const DEMO_TOURS: Readonly<Record<string, string>> = {
  "p-01": "https://realsee.ai/49kkWE9G?at3d=1", // Greenmount Residences
  "p-02": "https://realsee.ai/2VPPLEG9?at3d=1", // Mandarin Oriental
  "p-03": "https://realsee.ai/EOxx9XLV?at3d=1", // Home decoration showroom
  "p-04": "https://realsee.ai/v4OOR4qm?at3d=1", // Exquisite Waterfront Masterpiece
  "p-05": "https://realsee.ai/2VPPnGbP?at3d=1", // Sapphire Wood Castle Hill
  "p-06": "https://realsee.ai/GjVV2lEO?at3d=1", // Glebe House
  "p-07": "https://realsee.ai/ZyKKxD4e?at3d=1", // Warehouse Store
  "p-08": "https://realsee.ai/5jLLWAY5?at3d=1", // Mini Plant
  "p-09": "https://realsee.ai/Ae44XBBg?at3d=1", // Engine Rooms, Hexagon Classics
  "p-10": "https://realsee.ai/8VRR9e8a?at3d=1", // Bolling Hall Museum, Bradford
};

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

export const findDemoProperty = (id: string) =>
  DEMO_PROPERTIES.find((property) => property.id === id) ?? null;
