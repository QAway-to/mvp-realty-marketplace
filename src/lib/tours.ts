/**
 * Разбор ссылок на 3D-туры.
 *
 * Единственное место, где в систему попадает внешний URL, который потом
 * окажется в `src` у iframe. Поэтому здесь не «почистить строку», а разобрать
 * её и собрать embed-URL заново из опознанного идентификатора тура: тогда в
 * атрибут физически не может попасть ничего, кроме нашего же шаблона.
 *
 * Обоснование и модель угроз — docs/adr/0002-3d-tour-embedding.md.
 */

export type TourProvider = "MATTERPORT" | "KUULA" | "OTHER";

export type TourRejectionReason =
  | "not_a_url"
  | "not_https"
  | "host_not_allowed"
  | "tour_id_not_found";

export type ParsedTour = {
  readonly provider: TourProvider;
  readonly sourceUrl: string;
  /** Собран нами. `null`, если провайдер не поддерживает встраивание. */
  readonly embedUrl: string | null;
  readonly isEmbeddable: boolean;
};

export type TourParseResult =
  | { readonly ok: true; readonly tour: ParsedTour }
  | { readonly ok: false; readonly reason: TourRejectionReason };

/**
 * Хосты сравниваются строго и целиком. Не «заканчивается на matterport.com»:
 * так проходят и `evil-matterport.com`, и `my.matterport.com.attacker.net`.
 */
const PROVIDER_HOSTS: Readonly<Record<string, TourProvider>> = {
  "my.matterport.com": "MATTERPORT",
  "matterport.com": "MATTERPORT",
  "www.matterport.com": "MATTERPORT",
  "kuula.co": "KUULA",
  "www.kuula.co": "KUULA",
};

/** Источник правды и для валидации, и для `frame-src` в CSP. */
export const TOUR_FRAME_SOURCES: readonly string[] = [
  "https://my.matterport.com",
  "https://matterport.com",
  "https://www.matterport.com",
  "https://kuula.co",
  "https://www.kuula.co",
];

const MATTERPORT_ID = /^[A-Za-z0-9]{6,32}$/;
const KUULA_ID = /^[A-Za-z0-9_-]{3,64}$/;

/** Matterport: `https://my.matterport.com/show/?m=<id>`. */
function parseMatterport(url: URL): string | null {
  const id = url.searchParams.get("m");
  return id !== null && MATTERPORT_ID.test(id)
    ? `https://my.matterport.com/show/?m=${id}&play=1`
    : null;
}

/**
 * Kuula: `https://kuula.co/share/<id>` и `https://kuula.co/share/collection/<id>`.
 * Коллекция — это тот же embed, только с другим префиксом пути.
 */
function parseKuula(url: URL): string | null {
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] !== "share") return null;

  const isCollection = segments[1] === "collection";
  const id = isCollection ? segments[2] : segments[1];
  if (id === undefined || !KUULA_ID.test(id)) return null;

  const path = isCollection ? `share/collection/${id}` : `share/${id}`;
  return `https://kuula.co/${path}?fs=1&vr=1&thumbs=1`;
}

export function parseTourUrl(rawUrl: string): TourParseResult {
  const trimmed = rawUrl.trim();

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: "not_a_url" };
  }

  // Отсекает `javascript:`, `data:`, `file:` и http без шифрования — до того,
  // как хост вообще начнёт нас интересовать.
  if (url.protocol !== "https:") {
    return { ok: false, reason: "not_https" };
  }

  const provider = PROVIDER_HOSTS[url.hostname.toLowerCase()];
  if (provider === undefined) {
    return { ok: false, reason: "host_not_allowed" };
  }

  const embedUrl =
    provider === "MATTERPORT" ? parseMatterport(url) : parseKuula(url);

  if (embedUrl === null) {
    return { ok: false, reason: "tour_id_not_found" };
  }

  return {
    ok: true,
    tour: {
      provider,
      sourceUrl: trimmed,
      embedUrl,
      isEmbeddable: true,
    },
  };
}

export const TOUR_REJECTION_MESSAGES: Readonly<
  Record<TourRejectionReason, string>
> = {
  not_a_url: "Это не похоже на ссылку. Скопируйте адрес тура из браузера.",
  not_https: "Ссылка должна начинаться с https://.",
  host_not_allowed:
    "Мы встраиваем туры только с Matterport и Kuula. Пришлите ссылку с одного из этих сервисов.",
  tour_id_not_found:
    "В ссылке не нашёлся идентификатор тура. Нужна ссылка «Поделиться», а не адрес личного кабинета.",
};
