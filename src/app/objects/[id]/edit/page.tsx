import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { setStatus, softDeleteProperty, updateProperty } from "../../actions";
import { PropertyForm, type PropertyFormValues } from "../../PropertyForm";
import { canEditProperty, requireUser } from "@/lib/auth/guards";
import { getPrisma } from "@/lib/prisma";
import { listReferences } from "@/lib/references";

export const metadata: Metadata = { title: "Объект" };

const STATUS_OPTIONS = [
  ["DRAFT", "Черновик"],
  ["ACTIVE", "Активен"],
  ["RESERVED", "Задаток"],
  ["SOLD", "Продан"],
  ["RENTED", "Сдан"],
  ["WITHDRAWN", "Снят"],
] as const;

/** Число в поле формы — это строка. `null` и `undefined` дают пустое поле. */
const text = (value: number | string | null): string | undefined =>
  value === null ? undefined : String(value);

export default async function EditPropertyPage(
  props: PageProps<"/objects/[id]/edit">,
) {
  const { id } = await props.params;
  const user = await requireUser();

  const property = await getPrisma().property.findFirst({
    where: { id, deletedAt: null },
    include: {
      tours: { select: { sourceUrl: true }, take: 1 },
      activityLog: {
        select: { action: true, createdAt: true, user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (property === null) notFound();
  if (!canEditProperty(user, property.ownerId)) notFound();

  const references = await listReferences();

  const values: PropertyFormValues = {
    title: property.title,
    dealType: property.dealType,
    propertyType: property.propertyType,
    price: property.price === 0n ? undefined : String(property.price),
    commissionPercent: text(property.commissionPercent),
    areaTotal: text(property.areaTotal),
    areaLiving: text(property.areaLiving),
    areaKitchen: text(property.areaKitchen),
    landArea: text(property.landArea),
    rooms: text(property.rooms),
    floor: text(property.floor),
    floorsTotal: text(property.floorsTotal),
    bathrooms: text(property.bathrooms),
    balcony: property.balcony,
    ceilingHeight: text(property.ceilingHeight),
    buildingType: property.buildingType ?? "",
    renovation: property.renovation ?? "",
    builtYear: text(property.builtYear),
    parking: property.parking,
    cityId: property.cityId,
    districtId: property.districtId ?? "",
    complexId: property.complexId ?? "",
    street: property.street ?? "",
    houseNumber: property.houseNumber ?? "",
    apartmentNumber: property.apartmentNumber ?? "",
    description: property.description ?? "",
    internalNotes: property.internalNotes ?? "",
    tourUrl: property.tours[0]?.sourceUrl ?? "",
  };

  const update = updateProperty.bind(null, id);
  const changeStatus = setStatus.bind(null, id);
  const remove = softDeleteProperty.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/objects"
          className="self-start text-sm text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
        >
          ← К объектам
        </Link>
        <h1 className="text-[22px] font-medium tracking-tight">{property.title}</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4 border-b border-hairline-soft pb-6">
        <form action={changeStatus} className="flex items-end gap-2">
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            Статус
            <select
              name="status"
              defaultValue={property.status}
              className="h-12 rounded-[var(--radius-control)] border border-hairline px-3 text-base text-ink"
            >
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-12 rounded-[var(--radius-control)] border border-border-strong px-5 text-base font-medium text-ink"
          >
            Применить
          </button>
        </form>

        <Link
          href={`/catalog/${property.id}`}
          className="text-sm text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
        >
          Открыть карточку
        </Link>

        {/* Удаление мягкое, подтверждение делает браузер: диалог here уместен —
            действие уводит объект из выдачи. */}
        <form action={remove} className="ml-auto">
          <button
            type="submit"
            className="h-12 rounded-[var(--radius-control)] px-4 text-sm text-error underline decoration-transparent underline-offset-4 hover:decoration-current"
          >
            Удалить объект
          </button>
        </form>
      </div>

      <PropertyForm
        action={update}
        values={values}
        references={references}
        submitLabel="Сохранить"
        canPublish={property.status === "DRAFT"}
      />

      {property.activityLog.length > 0 ? (
        <section className="flex flex-col gap-2 border-t border-hairline-soft pt-6 pb-10">
          <h2 className="text-[16px] font-semibold">История изменений</h2>
          <ul className="flex flex-col gap-1 text-sm text-muted">
            {property.activityLog.map((entry, index) => (
              <li key={index}>
                {entry.createdAt.toLocaleString("ru-RU")} — {entry.action}
                {entry.user !== null ? `, ${entry.user.name}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
