"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canEditProperty, requireUser } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import type { PropertyFormState } from "./form-state";
import {
  deriveFields,
  missingForPublish,
  parsePropertyForm,
  type PropertyFormInput,
} from "@/lib/property-form";
import { fetchTourPreview } from "@/lib/tour-preview";
import { parseTourUrl } from "@/lib/tours";

/**
 * Поля для записи. `tourUrl` в таблицу объекта не идёт — тур живёт отдельной
 * записью, а здесь из него берётся только признак `hasTour`.
 */
function toWriteData({ tourUrl, ...fields }: PropertyFormInput) {
  const data = { ...fields, tourUrl };
  const derived = deriveFields(data, tourUrl !== undefined);

  return {
    ...fields,
    // Цена в схеме BigInt: коммерческий объект выходит за пределы Int32.
    // Незаполненная цена остаётся пустой, а не превращается в ноль.
    price: data.price === undefined ? null : BigInt(data.price),
    pricePerSqm: derived.pricePerSqm,
    isLastFloor: derived.isLastFloor,
    hasTour: derived.hasTour,
  };
}

/**
 * Тур и признак `hasTour` пишутся в одной транзакции с объектом. Иначе фильтр
 * «только с 3D-туром» рано или поздно расходится с тем, что есть у объекта.
 */
async function replaceTour(
  tx: Parameters<Parameters<ReturnType<typeof getPrisma>["$transaction"]>[0]>[0],
  propertyId: string,
  tourUrl: string | undefined,
  preview: string | null,
): Promise<void> {
  await tx.virtualTour.deleteMany({ where: { propertyId } });
  if (tourUrl === undefined) return;

  const parsed = parseTourUrl(tourUrl);
  // Форма уже отвергла бы плохую ссылку; сюда попадает только проверенная.
  if (!parsed.ok) return;

  await tx.virtualTour.create({
    data: {
      propertyId,
      provider: parsed.tour.provider,
      sourceUrl: parsed.tour.sourceUrl,
      embedUrl: parsed.tour.embedUrl,
      isEmbeddable: parsed.tour.isEmbeddable,
      previewImageUrl: preview,
    },
  });
}

/**
 * Превью тура тянем ДО транзакции: сетевой запрос к чужому серверу внутри
 * транзакции держал бы её открытой на секунды и занимал соединение с базой.
 * Неудача не мешает сохранению — обложка просто останется заглушкой.
 */
async function resolvePreview(tourUrl: string | undefined): Promise<string | null> {
  if (tourUrl === undefined) return null;

  const parsed = parseTourUrl(tourUrl);
  if (!parsed.ok) return null;

  return fetchTourPreview(parsed.tour.sourceUrl, parsed.tour.provider);
}

export async function createProperty(
  _previous: PropertyFormState,
  form: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();

  const parsed = parsePropertyForm(form);
  if (!parsed.ok) {
    return { errors: parsed.errors, message: "Проверьте выделенные поля" };
  }

  const wantsPublish = form.get("intent") === "publish";
  if (wantsPublish) {
    const missing = missingForPublish(parsed.data);
    if (missing.length > 0) {
      return {
        errors: {},
        message: `Для публикации заполните: ${missing.join(", ")}. Черновик можно сохранить и так.`,
      };
    }
  }

  // Город обязателен схемой базы, поэтому без него нельзя даже черновик.
  if (parsed.data.cityId === undefined) {
    return { errors: { cityId: "Выберите город" }, message: null };
  }

  const preview = await resolvePreview(parsed.data.tourUrl);

  const created = await getPrisma().$transaction(async (tx) => {
    const property = await tx.property.create({
      data: {
        ...toWriteData(parsed.data),
        cityId: parsed.data.cityId as string,
        ownerId: user.id,
        status: wantsPublish ? "ACTIVE" : "DRAFT",
        publishedAt: wantsPublish ? new Date() : null,
      },
      select: { id: true },
    });

    await replaceTour(tx, property.id, parsed.data.tourUrl, preview);

    await tx.activityLog.create({
      data: {
        propertyId: property.id,
        userId: user.id,
        action: wantsPublish ? "created_and_published" : "created_draft",
      },
    });

    return property;
  });

  revalidatePath("/objects");
  revalidatePath("/catalog");
  redirect(`/objects/${created.id}/edit`);
}

export async function updateProperty(
  propertyId: string,
  _previous: PropertyFormState,
  form: FormData,
): Promise<PropertyFormState> {
  const user = await requireUser();
  const prisma = getPrisma();

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { id: true, ownerId: true, status: true },
  });

  if (existing === null) {
    return { errors: {}, message: "Объект не найден" };
  }
  if (!canEditProperty(user, existing.ownerId)) {
    return {
      errors: {},
      message: "Этот объект ведёт другой агент. Правки может внести он или администратор.",
    };
  }

  const parsed = parsePropertyForm(form);
  if (!parsed.ok) {
    return { errors: parsed.errors, message: "Проверьте выделенные поля" };
  }
  if (parsed.data.cityId === undefined) {
    return { errors: { cityId: "Выберите город" }, message: null };
  }

  const wantsPublish = form.get("intent") === "publish";
  if (wantsPublish) {
    const missing = missingForPublish(parsed.data);
    if (missing.length > 0) {
      return {
        errors: {},
        message: `Для публикации заполните: ${missing.join(", ")}.`,
      };
    }
  }

  const shouldPublish = wantsPublish && existing.status === "DRAFT";
  const preview = await resolvePreview(parsed.data.tourUrl);

  await prisma.$transaction(async (tx) => {
    await tx.property.update({
      where: { id: propertyId },
      data: {
        ...toWriteData(parsed.data),
        cityId: parsed.data.cityId as string,
        ...(shouldPublish
          ? { status: "ACTIVE" as const, publishedAt: new Date() }
          : {}),
      },
    });

    await replaceTour(tx, propertyId, parsed.data.tourUrl, preview);

    await tx.activityLog.create({
      data: {
        propertyId,
        userId: user.id,
        action: shouldPublish ? "updated_and_published" : "updated",
      },
    });
  });

  revalidatePath("/objects");
  revalidatePath("/catalog");
  revalidatePath(`/catalog/${propertyId}`);

  return { errors: {}, message: "Сохранено" };
}

const ALLOWED_STATUSES = [
  "DRAFT",
  "ACTIVE",
  "RESERVED",
  "SOLD",
  "RENTED",
  "WITHDRAWN",
] as const;

type Status = (typeof ALLOWED_STATUSES)[number];

const isStatus = (value: unknown): value is Status =>
  typeof value === "string" && (ALLOWED_STATUSES as readonly string[]).includes(value);

export async function setStatus(propertyId: string, form: FormData): Promise<void> {
  const user = await requireUser();
  const prisma = getPrisma();

  const status = form.get("status");
  if (!isStatus(status)) return;

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { ownerId: true, status: true, publishedAt: true },
  });
  if (existing === null || !canEditProperty(user, existing.ownerId)) return;

  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: {
        status,
        // Дата публикации ставится один раз — это факт, а не текущее состояние.
        ...(status === "ACTIVE" && existing.publishedAt === null
          ? { publishedAt: new Date() }
          : {}),
      },
    }),
    prisma.activityLog.create({
      data: {
        propertyId,
        userId: user.id,
        action: "status_changed",
        changedFields: { from: existing.status, to: status },
      },
    }),
  ]);

  revalidatePath("/objects");
  revalidatePath("/catalog");
}

/** Удаление мягкое: карточка уходит из выдачи, история остаётся. */
export async function softDeleteProperty(propertyId: string): Promise<void> {
  const user = await requireUser();
  const prisma = getPrisma();

  const existing = await prisma.property.findFirst({
    where: { id: propertyId, deletedAt: null },
    select: { ownerId: true },
  });
  if (existing === null || !canEditProperty(user, existing.ownerId)) return;

  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: { deletedAt: new Date(), status: "WITHDRAWN" },
    }),
    prisma.activityLog.create({
      data: { propertyId, userId: user.id, action: "deleted" },
    }),
  ]);

  revalidatePath("/objects");
  revalidatePath("/catalog");
  redirect("/objects");
}
