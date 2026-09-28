/**
 * Фотографии объекта: приём, сжатие, адреса.
 *
 * На время демо байты лежат в Postgres (`ImageBlob`). Ключ в `PropertyImage`
 * несёт префикс бэкенда — `db:<id>`. Когда снимки переедут в объектное
 * хранилище, появится второй префикс и второй резолвер, а модель данных и
 * страницы останутся как есть.
 */

const DB_PREFIX = "db:";

/** Столько принимаем на вход. Телефонный снимок обычно 2–5 МБ. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Больше на объект не нужно, а базе демо-стенда это лишний вес. */
export const MAX_IMAGES_PER_PROPERTY = 15;

/** По длинной стороне. Для карточки и страницы объекта этого с запасом. */
const MAX_DIMENSION = 1600;

const ACCEPTED_INPUT = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/avif",
]);

export type ImageRejection =
  | "too_large"
  | "unsupported_type"
  | "too_many"
  | "broken";

export const IMAGE_REJECTION_MESSAGES: Readonly<
  Record<ImageRejection, string>
> = {
  too_large: "Файл больше 12 МБ. Уменьшите или снимите ещё раз.",
  unsupported_type: "Такой формат не принимаем. Нужны JPEG, PNG, WebP или HEIC.",
  too_many: `Больше ${MAX_IMAGES_PER_PROPERTY} фотографий на объект не добавить.`,
  broken: "Файл не открылся как изображение.",
};

export type ProcessedImage = {
  /**
   * Тип с явным `ArrayBuffer` в параметре: Prisma ждёт именно его, а `Buffer` из
   * sharp и голый `Uint8Array` типизированы поверх `ArrayBufferLike`, который к
   * нему не приводится.
   */
  readonly data: Uint8Array<ArrayBuffer>;
  readonly contentType: string;
  readonly width: number;
  readonly height: number;
};

export type ProcessResult =
  | { readonly ok: true; readonly image: ProcessedImage }
  | { readonly ok: false; readonly reason: ImageRejection };

/** Ключ хранилища для байтов в базе. */
export const toDbKey = (blobId: string): string => `${DB_PREFIX}${blobId}`;

/** Идентификатор блоба из ключа, либо `null`, если ключ не про базу. */
export function blobIdFromKey(storageKey: string): string | null {
  if (!storageKey.startsWith(DB_PREFIX)) return null;

  const id = storageKey.slice(DB_PREFIX.length);
  // Ключ приходит из адресной строки: пускаем только то, что похоже на cuid.
  return /^[a-z0-9]{20,40}$/i.test(id) ? id : null;
}

/**
 * Адрес для тега `img`.
 *
 * Внешние адреса (превью тура) отдаём как есть, ключи базы превращаем в наш
 * маршрут. Так карточка не знает, где лежит картинка.
 */
export function imageUrl(storageKey: string): string {
  if (storageKey.startsWith("https://")) return storageKey;

  const blobId = blobIdFromKey(storageKey);
  return blobId === null ? storageKey : `/api/images/${blobId}`;
}

/**
 * Сжимает снимок и переводит в WebP.
 *
 * Оригинал не храним сознательно: снимок с телефона это 3–5 МБ и 4000 пикселей
 * по длинной стороне, а в интерфейсе он никогда не показывается больше чем на
 * 1600. Хранить разницу — платить за то, что никто не увидит.
 *
 * `sharp` подгружается динамически: это нативный модуль, и незачем тянуть его в
 * бандл страниц, которые картинки не обрабатывают.
 */
export async function processImage(file: File): Promise<ProcessResult> {
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "too_large" };
  if (!ACCEPTED_INPUT.has(file.type.toLowerCase())) {
    return { ok: false, reason: "unsupported_type" };
  }

  try {
    const { default: sharp } = await import("sharp");
    const input = Buffer.from(await file.arrayBuffer());

    const pipeline = sharp(input, { failOn: "error" })
      // Поворот по EXIF: снятое телефоном иначе ложится набок.
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    return {
      ok: true,
      image: {
        // Копия, а не представление над буфером sharp: тип `Uint8Array<ArrayBuffer>`
        // требуется Prisma, а вид поверх `ArrayBufferLike` к нему не приводится.
        // После сжатия это сотни килобайт — копировать не жалко.
        data: Uint8Array.from(data),
        contentType: "image/webp",
        width: info.width,
        height: info.height,
      },
    };
  } catch {
    return { ok: false, reason: "broken" };
  }
}
