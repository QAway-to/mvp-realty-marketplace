import { describe, expect, it } from "vitest";

import {
  extractOgImage,
  isAllowedImageUrl,
  thumbnailUrl,
  TOUR_IMAGE_SOURCES,
} from "./tour-preview";

const REAL =
  "https://global-image-4.realsee-cdn.com/release/screenshot/x/y/pc0_A.jpg?imageMogr2/quality/70/thumbnail/1024x";

describe("извлечение og:image", () => {
  it("находит тег в обычном порядке атрибутов", () => {
    const html = `<meta property="og:image" content="${REAL}"/>`;
    expect(extractOgImage(html)).toBe(REAL);
  });

  it("находит тег, когда content идёт первым", () => {
    const html = `<meta content="${REAL}" property="og:image">`;
    expect(extractOgImage(html)).toBe(REAL);
  });

  it("не путает с другими мета-тегами", () => {
    const html = `<meta property="og:title" content="Квартира"/>`;
    expect(extractOgImage(html)).toBeNull();
  });

  it("возвращает null, когда обложки нет", () => {
    expect(extractOgImage("<html><head></head></html>")).toBeNull();
  });
});

describe("проверка адреса обложки", () => {
  it("принимает CDN Realsee", () => {
    expect(isAllowedImageUrl(REAL, "REALSEE")).toBe(true);
    expect(
      isAllowedImageUrl("https://global-public.realsee-cdn.com/a.jpg", "REALSEE"),
    ).toBe(true);
  });

  it("отклоняет домен, который лишь заканчивается на разрешённый", () => {
    expect(
      isAllowedImageUrl("https://evil-realsee-cdn.com/a.jpg", "REALSEE"),
    ).toBe(false);
  });

  it("отклоняет разрешённый хост в поддомене чужого", () => {
    expect(
      isAllowedImageUrl(
        "https://global-image-4.realsee-cdn.com.attacker.net/a.jpg",
        "REALSEE",
      ),
    ).toBe(false);
  });

  it("отклоняет http", () => {
    expect(
      isAllowedImageUrl("http://global-image-4.realsee-cdn.com/a.jpg", "REALSEE"),
    ).toBe(false);
  });

  it("отклоняет javascript:", () => {
    expect(isAllowedImageUrl("javascript:alert(1)", "REALSEE")).toBe(false);
  });

  it("отклоняет обложку с чужого CDN, даже разрешённого у другого провайдера", () => {
    // Провайдеры, для которых список картинок не заведён, обложек не получают:
    // молча доверять их разметке нельзя.
    expect(isAllowedImageUrl(REAL, "KUULA")).toBe(false);
    expect(isAllowedImageUrl(REAL, "MATTERPORT")).toBe(false);
  });

  it("отклоняет мусор вместо ссылки", () => {
    expect(isAllowedImageUrl("не ссылка", "REALSEE")).toBe(false);
  });
});

describe("уменьшение обложки", () => {
  it("подменяет ширину в параметре CDN", () => {
    expect(thumbnailUrl(REAL, 640)).toContain("thumbnail/640x");
    expect(thumbnailUrl(REAL, 640)).not.toContain("thumbnail/1024x");
  });

  it("оставляет адрес как есть, когда параметра нет", () => {
    const plain = "https://global-image-4.realsee-cdn.com/a.jpg";
    expect(thumbnailUrl(plain, 640)).toBe(plain);
  });

  it("не трогает остальные параметры обработки", () => {
    expect(thumbnailUrl(REAL, 640)).toContain("quality/70");
  });
});

describe("TOUR_IMAGE_SOURCES", () => {
  it("перечисляет только https", () => {
    for (const source of TOUR_IMAGE_SOURCES) {
      expect(source.startsWith("https://")).toBe(true);
    }
  });

  it("каждый источник проходит ту же проверку, что и обложка", () => {
    for (const source of TOUR_IMAGE_SOURCES) {
      expect(isAllowedImageUrl(`${source}/a.jpg`, "REALSEE")).toBe(true);
    }
  });
});
