/**
 * Разбор и проверка формы объекта.
 *
 * Чистый модуль: принимает `FormData`, отдаёт либо готовые к записи данные, либо
 * ошибки по полям. Никакой базы и никаких cookie, поэтому логика проверок
 * покрывается тестами без поднятого Postgres.
 */

import { z } from "zod";

import { parseTourUrl, TOUR_REJECTION_MESSAGES } from "./tours";
import { blankToUndefined } from "./zod-helpers";

const CURRENT_YEAR = new Date().getFullYear();

const optionalInt = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().nonnegative().optional(),
);

const optionalPositiveInt = z.preprocess(
  blankToUndefined,
  z.coerce.number().int().positive().optional(),
);

const optionalArea = z.preprocess(
  blankToUndefined,
  z.coerce.number().positive().max(100_000).optional(),
);

const optionalText = (max: number) =>
  z.preprocess(blankToUndefined, z.string().trim().max(max).optional());

const optionalId = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).max(64).optional(),
);

/** Чекбокс приезжает как `"on"`, когда отмечен, и не приезжает вовсе, когда нет. */
const checkbox = z.preprocess(
  (raw) => raw === "on" || raw === "1" || raw === "true",
  z.boolean(),
);

export const propertyFormSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    dealType: z.enum(["SALE", "RENT"]),
    propertyType: z.enum(["APARTMENT", "HOUSE", "LAND", "COMMERCIAL"]),

    price: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().positive().max(100_000_000_000).optional(),
    ),
    commissionPercent: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(0).max(100).optional(),
    ),

    areaTotal: optionalArea,
    areaLiving: optionalArea,
    areaKitchen: optionalArea,
    landArea: optionalArea,

    rooms: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(0).max(20).optional(),
    ),
    floor: optionalPositiveInt,
    floorsTotal: optionalPositiveInt,
    bathrooms: optionalInt,
    balcony: z.enum(["NONE", "BALCONY", "LOGGIA"]).default("NONE"),
    ceilingHeight: z.preprocess(
      blankToUndefined,
      z.coerce.number().min(1.5).max(10).optional(),
    ),

    buildingType: z.preprocess(
      blankToUndefined,
      z.enum(["PANEL", "BRICK", "MONOLITH", "BLOCK", "WOOD"]).optional(),
    ),
    renovation: z.preprocess(
      blankToUndefined,
      z.enum(["NONE", "COSMETIC", "EURO", "DESIGNER"]).optional(),
    ),
    builtYear: z.preprocess(
      blankToUndefined,
      z.coerce.number().int().min(1800).max(CURRENT_YEAR + 5).optional(),
    ),
    parking: checkbox,

    cityId: optionalId,
    districtId: optionalId,
    complexId: optionalId,
    street: optionalText(160),
    houseNumber: optionalText(32),
    apartmentNumber: optionalText(32),

    description: optionalText(8000),
    internalNotes: optionalText(4000),

    tourUrl: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (
      data.floor !== undefined &&
      data.floorsTotal !== undefined &&
      data.floor > data.floorsTotal
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["floor"],
        message: "Этаж не может быть больше этажности дома",
      });
    }

    if (
      data.areaLiving !== undefined &&
      data.areaTotal !== undefined &&
      data.areaLiving > data.areaTotal
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["areaLiving"],
        message: "Жилая площадь не может быть больше общей",
      });
    }

    if (
      data.areaKitchen !== undefined &&
      data.areaTotal !== undefined &&
      data.areaKitchen > data.areaTotal
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["areaKitchen"],
        message: "Площадь кухни не может быть больше общей",
      });
    }

    // Ссылку на тур проверяем здесь же, чтобы агент увидел причину отказа рядом
    // с полем, а не общей ошибкой сохранения.
    if (data.tourUrl !== undefined) {
      const tour = parseTourUrl(data.tourUrl);
      if (!tour.ok) {
        ctx.addIssue({
          code: "custom",
          path: ["tourUrl"],
          message: TOUR_REJECTION_MESSAGES[tour.reason],
        });
      }
    }
  });

export type PropertyFormInput = z.infer<typeof propertyFormSchema>;

/** Ошибки в виде «поле → сообщение»: форма показывает их рядом с полями. */
export type FieldErrors = Readonly<Record<string, string>>;

export type PropertyFormResult =
  | { readonly ok: true; readonly data: PropertyFormInput }
  | { readonly ok: false; readonly errors: FieldErrors };

export function parsePropertyForm(form: FormData): PropertyFormResult {
  const raw = Object.fromEntries(form.entries());
  const parsed = propertyFormSchema.safeParse(raw);

  if (parsed.success) return { ok: true, data: parsed.data };

  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path.join(".") || "form";
    // Первая ошибка по полю информативнее последней: она про причину, а не про
    // следствие.
    if (errors[field] === undefined) errors[field] = issue.message;
  }
  return { ok: false, errors };
}

/**
 * Поля, без которых объект нельзя публиковать. Черновик сохраняется с любыми
 * пробелами — агент заводит карточку по ходу разговора с собственником.
 *
 * Фотографию PRD тоже требует при публикации, но проверки на неё здесь нет:
 * загрузка появится вместе с хранилищем (ADR 0003), а до тех пор требование
 * запрещало бы публикацию вообще. Как только загрузка заработает, условие
 * добавляется сюда.
 */
export const PUBLISH_REQUIRED: readonly (keyof PropertyFormInput)[] = [
  "title",
  "dealType",
  "propertyType",
  "price",
  "areaTotal",
  "cityId",
  "street",
];

const PUBLISH_FIELD_LABELS: Readonly<Record<string, string>> = {
  title: "название",
  dealType: "тип сделки",
  propertyType: "тип объекта",
  price: "цена",
  areaTotal: "общая площадь",
  cityId: "город",
  street: "улица",
};

/** Возвращает список незаполненного. Пустой список значит «публиковать можно». */
export function missingForPublish(
  data: PropertyFormInput,
): readonly string[] {
  return PUBLISH_REQUIRED.filter((field) => {
    const value = data[field];
    return value === undefined || value === null || value === "";
  }).map((field) => PUBLISH_FIELD_LABELS[field] ?? String(field));
}

/**
 * Поля, которые считаются из других, а не вводятся руками. Держим расчёт в
 * одном месте: он нужен и при создании, и при каждом изменении, и разойтись эти
 * два пути не должны.
 *
 * `pricePerSqm` и `isLastFloor` лежат в базе колонками ради индексов и фильтров
 * — см. docs/DOMAIN.md.
 */
export function deriveFields(data: PropertyFormInput, hasTour: boolean) {
  const pricePerSqm =
    data.price !== undefined && data.areaTotal !== undefined && data.areaTotal > 0
      ? Math.round(data.price / data.areaTotal)
      : null;

  const isLastFloor =
    data.floor !== undefined &&
    data.floorsTotal !== undefined &&
    data.floor === data.floorsTotal;

  return { pricePerSqm, isLastFloor, hasTour };
}
