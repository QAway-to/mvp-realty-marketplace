import Link from "next/link";

import { thumbnailUrl } from "@/lib/tour-preview";
import {
  formatArea,
  formatFloor,
  formatPrice,
  formatPricePerSqm,
  formatRooms,
} from "@/lib/format";
import type { PropertyCardView } from "@/lib/property-view";

interface PropertyCardProps {
  property: PropertyCardView;
}

/** Плашка вместо фото: внешние картинки не тянем, пока нет своего хранилища. */
function CoverPlaceholder({ hasTour }: { hasTour: boolean }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-strong to-surface-soft">
      <span className="text-4xl opacity-25" aria-hidden="true">
        {hasTour ? "🧭" : "🏠"}
      </span>
    </div>
  );
}

export function PropertyCard({ property }: PropertyCardProps) {
  const roomsLabel = formatRooms(property.rooms);
  const floorLabel = formatFloor(property.floor, property.floorsTotal);
  const address = [property.complexName, property.street]
    .filter((part): part is string => part !== null)
    .join(" · ");

  return (
    <Link
      href={`/catalog/${property.id}`}
      className="group block focus-visible:outline-none"
    >
      <article className="flex flex-col gap-3">
        <div className="relative aspect-4/3 overflow-hidden rounded-[var(--radius-card)] bg-surface-soft">
          {property.coverUrl === null ? (
            <CoverPlaceholder hasTour={property.hasTour} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- обложка приходит с CDN провайдера, next/image тут только мешает
            <img
              src={thumbnailUrl(property.coverUrl, 640)}
              alt={property.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}

          {property.hasTour ? (
            <span className="absolute left-3 top-3 rounded-full bg-canvas/95 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-sm backdrop-blur">
              3D-тур
            </span>
          ) : null}

          {property.imagesCount > 0 ? (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-medium text-white">
              {property.imagesCount} фото
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-base font-semibold text-ink">
              {formatPrice(property.price)}
            </p>
            {property.pricePerSqm !== null ? (
              <p className="shrink-0 text-[13px] text-muted">
                {formatPricePerSqm(property.pricePerSqm)}
              </p>
            ) : null}
          </div>

          <p className="text-sm font-medium text-ink">
            {[roomsLabel, formatArea(property.areaTotal), floorLabel]
              .filter((part): part is string => part !== null)
              .join(" · ")}
          </p>

          <p className="truncate text-sm text-muted" title={address}>
            {property.districtName !== null ? `${property.districtName}` : ""}
            {address !== "" ? ` · ${address}` : ""}
          </p>
        </div>
      </article>
    </Link>
  );
}
