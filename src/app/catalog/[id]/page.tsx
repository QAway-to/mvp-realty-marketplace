import Link from "next/link";
import { notFound } from "next/navigation";

import { TourFrame } from "@/components/TourFrame";
import { DEMO_TOURS, findDemoProperty } from "@/lib/demo-data";
import {
  formatArea,
  formatFloor,
  formatPrice,
  formatPricePerSqm,
  formatRooms,
} from "@/lib/format";
import { getProperty, isDemoMode } from "@/lib/properties";
import { thumbnailUrl } from "@/lib/tour-preview";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-hairline-soft py-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-right text-base text-ink">{value}</dd>
    </div>
  );
}

export default async function PropertyPage(props: PageProps<"/catalog/[id]">) {
  const { id } = await props.params;

  // Демо-режим и база отличаются только источником; дальше страница одна и та же.
  const fromDemo = isDemoMode() ? findDemoProperty(id) : null;
  // Каталог закрыт входом, поэтому сотруднику показываем и черновики: он их и
  // завёл. Публичная ссылка клиенту будет читать этот же объект как "client".
  const fromDb = isDemoMode() ? null : await getProperty(id, "staff");

  const property = fromDemo ?? fromDb;
  if (property === null) notFound();

  const tourUrl =
    fromDemo !== null ? (DEMO_TOURS[fromDemo.id] ?? null) : (fromDb?.tourSourceUrl ?? null);

  const parking = fromDemo !== null ? fromDemo.parking : (fromDb?.parking ?? false);

  const photos = fromDb?.photos ?? [];
  const area = formatArea(property.areaTotal);
  const pricePerSqm = formatPricePerSqm(property.pricePerSqm);

  const rows = [
    { label: "Тип сделки", value: property.dealType === "SALE" ? "Продажа" : "Аренда" },
    ...(area !== null ? [{ label: "Площадь", value: area }] : []),
    ...(formatRooms(property.rooms) !== null
      ? [{ label: "Комнат", value: formatRooms(property.rooms) as string }]
      : []),
    ...(formatFloor(property.floor, property.floorsTotal) !== null
      ? [
          {
            label: "Этаж",
            value: formatFloor(property.floor, property.floorsTotal) as string,
          },
        ]
      : []),
    ...(pricePerSqm !== null
      ? [{ label: "Цена за м²", value: pricePerSqm }]
      : []),
    ...(property.districtName !== null
      ? [{ label: "Район", value: property.districtName }]
      : []),
    ...(property.complexName !== null
      ? [{ label: "ЖК", value: property.complexName }]
      : []),
    { label: "Парковка", value: parking ? "Есть" : "Нет" },
  ];

  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <Link
          href="/catalog"
          className="self-start text-sm text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
        >
          ← К каталогу
        </Link>
        <h1 className="text-[28px] font-bold tracking-tight">{property.title}</h1>
        <p className="text-base text-muted">
          {[property.districtName, property.complexName, property.street]
            .filter((part): part is string => part !== null)
            .join(" · ")}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="text-[20px] font-semibold tracking-tight">3D-тур</h2>
            {tourUrl === null ? (
              <div className="rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface-soft p-8 text-center">
                <p className="text-sm text-muted">
                  Тур не загружен. Вставьте ссылку с Matterport или Kuula в карточке
                  объекта.
                </p>
              </div>
            ) : (
              <TourFrame sourceUrl={tourUrl} />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-[20px] font-semibold tracking-tight">Фотографии</h2>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((photo) => (
                  <div
                    key={photo.url}
                    className="overflow-hidden rounded-[var(--radius-control)] bg-surface-soft"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- отдаём из своего маршрута, next/image тут лишний слой */}
                    <img
                      src={photo.url}
                      alt={photo.alt ?? property.title}
                      loading="lazy"
                      className="aspect-4/3 w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : property.coverUrl !== null ? (
              <>
                <div className="overflow-hidden rounded-[var(--radius-card)] bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element -- картинка с CDN провайдера тура */}
                  <img
                    src={thumbnailUrl(property.coverUrl, 1024)}
                    alt={property.title}
                    className="aspect-video w-full object-cover"
                  />
                </div>
                <p className="text-[13px] text-muted">
                  Это кадр из 3D-тура. Своих фотографий у объекта пока нет.
                </p>
              </>
            ) : (
              <div className="rounded-[var(--radius-card)] border border-dashed border-hairline bg-surface-soft p-8 text-center">
                <p className="text-sm text-muted">Фотографий пока нет.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="flex h-fit flex-col gap-4 rounded-[var(--radius-card)] border border-hairline bg-canvas p-6 shadow-[0_6px_16px_rgba(0,0,0,0.06)] lg:sticky lg:top-28">
          <p className="text-[28px] font-bold tracking-tight">
            {formatPrice(property.price)}
          </p>

          <dl className="flex flex-col">
            {rows.map((row) => (
              <Row key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>

          <button
            type="button"
            className="h-12 rounded-[var(--radius-control)] bg-rausch px-6 text-base font-medium text-white transition-colors hover:bg-rausch-active"
          >
            Добавить в подборку
          </button>
          <p className="text-[13px] text-muted">
            Подборки и ссылка клиенту — следующий эпик, E6 в PRD.
          </p>
        </aside>
      </div>
    </article>
  );
}
