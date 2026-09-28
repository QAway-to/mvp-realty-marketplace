/**
 * Обложка карточки из превью самого тура.
 *
 * У страницы тура есть `og:image` — скриншот пространства, который провайдер уже
 * сделал и раздаёт со своего CDN. Это даёт непустые карточки до того, как
 * появится своё хранилище фотографий (ADR 0003), и не стоит ничего.
 *
 * Адрес приезжает из разметки чужой страницы, то есть это недоверенные данные:
 * хост проверяется строгим выражением, а не «заканчивается на realsee-cdn.com».
 * Иначе достаточно поднять `evil-realsee-cdn.com`, чтобы наши карточки начали
 * тянуть картинки откуда угодно.
 */

import type { TourProvider } from "./tours";

/** Хосты картинок Realsee. Точное совпадение по шаблону, без суффиксов. */
const REALSEE_IMAGE_HOST = /^global-(?:image-\d{1,2}|public|static)\.realsee-cdn\.com$/;

const IMAGE_HOSTS: Partial<Record<TourProvider, RegExp>> = {
  REALSEE: REALSEE_IMAGE_HOST,
};

/** Источники для `img-src` в CSP. Тот же список, что проверяет валидация. */
export const TOUR_IMAGE_SOURCES: readonly string[] = [
  "https://global-image-1.realsee-cdn.com",
  "https://global-image-2.realsee-cdn.com",
  "https://global-image-3.realsee-cdn.com",
  "https://global-image-4.realsee-cdn.com",
  "https://global-public.realsee-cdn.com",
  "https://global-static.realsee-cdn.com",
];

/** Достаёт `content` из мета-тега `og:image`, в любом порядке атрибутов. */
export function extractOgImage(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1] !== undefined) return match[1];
  }
  return null;
}

/** Проверяет, что адрес картинки принадлежит CDN этого провайдера. */
export function isAllowedImageUrl(
  rawUrl: string,
  provider: TourProvider,
): boolean {
  const allowed = IMAGE_HOSTS[provider];
  if (allowed === undefined) return false;

  try {
    const url = new URL(rawUrl);
    return url.protocol === "https:" && allowed.test(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Уменьшенная версия для сетки каталога.
 *
 * В адресе уже стоит `thumbnail/1024x` — параметр обработки на стороне CDN.
 * Оригинал весит около 350 КБ, и двадцать четыре таких на страницу выдачи — это
 * восемь мегабайт впустую. Ширину подменяем только если шаблон точно совпал:
 * угадывать формат чужих параметров нельзя.
 */
export function thumbnailUrl(rawUrl: string, width: number): string {
  return rawUrl.replace(/(thumbnail\/)\d+x/, `$1${width}x`);
}

/**
 * Забирает превью со страницы тура. Возвращает `null` при любой неудаче:
 * отсутствие обложки не повод не сохранить объект.
 */
export async function fetchTourPreview(
  tourUrl: string,
  provider: TourProvider,
  timeoutMs = 8000,
): Promise<string | null> {
  const abort = AbortSignal.timeout(timeoutMs);

  try {
    const response = await fetch(tourUrl, {
      signal: abort,
      redirect: "follow",
      headers: { accept: "text/html" },
    });
    if (!response.ok) return null;

    const html = await response.text();
    const candidate = extractOgImage(html);
    if (candidate === null) return null;

    return isAllowedImageUrl(candidate, provider) ? candidate : null;
  } catch {
    return null;
  }
}
