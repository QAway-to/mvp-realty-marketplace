import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth/guards";
import { formatArea, formatPrice } from "@/lib/format";
import { getPrisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Мои объекты" };

const STATUS_LABELS: Readonly<Record<string, string>> = {
  DRAFT: "Черновик",
  ACTIVE: "Активен",
  RESERVED: "Задаток",
  SOLD: "Продан",
  RENTED: "Сдан",
  WITHDRAWN: "Снят",
};

export default async function ObjectsPage() {
  const user = await requireUser();

  // Агент видит свои объекты, админ — все: он модерирует и подхватывает
  // карточки уволившихся.
  const properties = await getPrisma().property.findMany({
    where: {
      deletedAt: null,
      ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      price: true,
      areaTotal: true,
      hasTour: true,
      updatedAt: true,
      owner: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-medium tracking-tight">
          {user.role === "ADMIN" ? "Все объекты" : "Мои объекты"}
        </h1>
        <Link
          href="/objects/new"
          className="flex h-12 items-center rounded-[var(--radius-control)] bg-rausch px-6 text-base font-medium text-white transition-colors hover:bg-rausch-active"
        >
          Добавить объект
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface-soft p-10 text-center">
          <p className="text-base font-medium">Объектов пока нет</p>
          <p className="mt-1 text-sm text-muted">
            Заведите первый: заполните адрес, цену и вставьте ссылку на 3D-тур.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-hairline-soft">
          {properties.map((property) => (
            <li key={property.id} className="flex flex-wrap items-center gap-4 py-4">
              <div className="min-w-60 flex-1">
                <Link
                  href={`/objects/${property.id}/edit`}
                  className="text-base font-medium text-ink underline decoration-transparent underline-offset-4 hover:decoration-ink"
                >
                  {property.title}
                </Link>
                <p className="text-sm text-muted">
                  {formatPrice(Number(property.price))} · {formatArea(property.areaTotal)}
                  {user.role === "ADMIN" && property.owner !== null
                    ? ` · ${property.owner.name}`
                    : ""}
                </p>
              </div>

              {property.hasTour ? (
                <span className="rounded-full bg-surface-strong px-2.5 py-1 text-[12px] font-semibold text-body">
                  3D-тур
                </span>
              ) : null}

              <span className="rounded-full border border-hairline px-3 py-1 text-[13px] text-body">
                {STATUS_LABELS[property.status] ?? property.status}
              </span>

              <Link
                href={`/catalog/${property.id}`}
                className="text-sm text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
              >
                Посмотреть
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
