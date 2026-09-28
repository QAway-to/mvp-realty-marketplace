import { deletePhoto, setCoverPhoto, uploadPhotos } from "./actions";
import { MAX_IMAGES_PER_PROPERTY } from "@/lib/images";

export type ManagedPhoto = {
  readonly id: string;
  readonly url: string;
  readonly isCover: boolean;
};

interface PhotoManagerProps {
  readonly propertyId: string;
  readonly photos: readonly ManagedPhoto[];
}

/**
 * Фотографии объекта: загрузка, обложка, удаление.
 *
 * Серверный компонент с обычными формами — без клиентского состояния. Загрузка
 * файлов и так требует обращения к серверу, а прогресс-бар для пятнадцати
 * снимков не стоит килобайтов JavaScript в каждой сборке.
 */
export function PhotoManager({ propertyId, photos }: PhotoManagerProps) {
  const upload = uploadPhotos.bind(null, propertyId);
  const remove = deletePhoto.bind(null, propertyId);
  const makeCover = setCoverPhoto.bind(null, propertyId);
  const slotsLeft = MAX_IMAGES_PER_PROPERTY - photos.length;

  return (
    <section className="flex flex-col gap-4 border-b border-hairline-soft pb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[20px] font-semibold tracking-tight">Фотографии</h2>
        <p className="text-[13px] text-muted">
          {photos.length} из {MAX_IMAGES_PER_PROPERTY}
        </p>
      </div>

      {photos.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <li
              key={photo.id}
              className="group relative overflow-hidden rounded-[var(--radius-control)] bg-surface-soft"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- отдаём из своего маршрута */}
              <img
                src={photo.url}
                alt=""
                loading="lazy"
                className="aspect-4/3 w-full object-cover"
              />

              {photo.isCover ? (
                <span className="absolute left-2 top-2 rounded-full bg-canvas/95 px-2 py-0.5 text-[11px] font-semibold text-ink">
                  Обложка
                </span>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/70 px-2 py-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                {photo.isCover ? (
                  <span className="text-[11px] text-white/70">на карточке</span>
                ) : (
                  <form action={makeCover}>
                    <input type="hidden" name="imageId" value={photo.id} />
                    <button
                      type="submit"
                      className="text-[11px] text-white underline decoration-transparent underline-offset-2 hover:decoration-current"
                    >
                      Сделать обложкой
                    </button>
                  </form>
                )}

                <form action={remove}>
                  <input type="hidden" name="imageId" value={photo.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-white underline decoration-transparent underline-offset-2 hover:decoration-current"
                  >
                    Удалить
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          Фотографий нет. Пока их нет, на карточке показывается кадр из 3D-тура.
        </p>
      )}

      {slotsLeft > 0 ? (
        <form action={upload} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            Добавить фотографии
            <input
              type="file"
              name="photos"
              multiple
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif"
              className="rounded-[var(--radius-control)] border border-hairline px-3 py-2.5 text-sm text-ink"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-[var(--radius-control)] border border-border-strong px-5 text-sm font-medium text-ink"
          >
            Загрузить
          </button>
          <p className="text-[13px] text-muted">
            Снимки уменьшаются до 1600px и переводятся в WebP. Можно выбрать
            несколько сразу, осталось мест: {slotsLeft}.
          </p>
        </form>
      ) : (
        <p className="text-[13px] text-muted">
          Достигнут предел в {MAX_IMAGES_PER_PROPERTY} фотографий. Удалите лишние,
          чтобы добавить новые.
        </p>
      )}
    </section>
  );
}
