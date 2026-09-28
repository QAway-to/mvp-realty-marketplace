import { parseTourUrl, TOUR_REJECTION_MESSAGES } from "@/lib/tours";

interface TourFrameProps {
  /** Ровно то, что вставил агент. Разбираем здесь, а не доверяем вызывающему. */
  readonly sourceUrl: string;
}

/**
 * 3D-тур в карточке. В `src` попадает только URL, собранный `parseTourUrl` из
 * опознанного идентификатора тура, — не строка агента.
 *
 * `sandbox` оставляет туру скрипты и полноэкранный режим, но не даёт ни доступа
 * к нашему origin, ни навигации верхнего окна: встраиваемая страница не наша, и
 * вести себя с ней как со своей незачем.
 */
export function TourFrame({ sourceUrl }: TourFrameProps) {
  const result = parseTourUrl(sourceUrl);

  if (!result.ok) {
    return (
      <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-soft p-6">
        <p className="text-sm font-medium text-error">Тур не показан</p>
        <p className="mt-1 text-sm text-body">
          {TOUR_REJECTION_MESSAGES[result.reason]}
        </p>
      </div>
    );
  }

  const { tour } = result;

  if (tour.embedUrl === null) {
    return (
      <a
        href={tour.sourceUrl}
        target="_blank"
        rel="noreferrer noopener external"
        className="inline-flex h-12 items-center rounded-[var(--radius-control)] bg-rausch px-6 text-base font-medium text-white transition-colors hover:bg-rausch-active"
      >
        Открыть 3D-тур
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-hairline-soft bg-surface-soft">
      <iframe
        src={tour.embedUrl}
        title="3D-тур по объекту"
        loading="lazy"
        allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
        sandbox="allow-scripts allow-same-origin allow-popups"
        referrerPolicy="strict-origin-when-cross-origin"
        className="aspect-video w-full border-0"
      />
    </div>
  );
}
