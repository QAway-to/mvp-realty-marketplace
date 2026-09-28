import sharp from "sharp";
import { describe, expect, it } from "vitest";

import {
  blobIdFromKey,
  imageUrl,
  MAX_UPLOAD_BYTES,
  processImage,
  toDbKey,
} from "./images";

const CUID = "clz4k9x2m0000abcdefghijkl";

describe("ключи хранилища", () => {
  it("собирает и разбирает ключ базы", () => {
    const key = toDbKey(CUID);

    expect(key).toBe(`db:${CUID}`);
    expect(blobIdFromKey(key)).toBe(CUID);
  });

  it("не принимает ключ чужого бэкенда", () => {
    expect(blobIdFromKey(`s3:${CUID}`)).toBeNull();
  });

  it("не принимает подозрительный идентификатор из адреса", () => {
    // Ключ попадает в путь маршрута, поэтому формат проверяется до запроса.
    expect(blobIdFromKey("db:../../etc/passwd")).toBeNull();
    expect(blobIdFromKey("db:")).toBeNull();
    expect(blobIdFromKey("db:short")).toBeNull();
  });
});

describe("адрес картинки", () => {
  it("ключ базы превращает в свой маршрут", () => {
    expect(imageUrl(toDbKey(CUID))).toBe(`/api/images/${CUID}`);
  });

  it("внешний адрес отдаёт как есть", () => {
    const external = "https://global-image-4.realsee-cdn.com/a.jpg";
    expect(imageUrl(external)).toBe(external);
  });
});

describe("обработка снимка", () => {
  const makeJpeg = async (width: number, height: number): Promise<Buffer> =>
    sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 120, g: 140, b: 160 },
      },
    })
      .jpeg()
      .toBuffer();

  const asFile = (bytes: Buffer, type = "image/jpeg"): File =>
    new File([new Uint8Array(bytes)], "photo.jpg", { type });

  it("переводит в WebP", async () => {
    const result = await processImage(asFile(await makeJpeg(800, 600)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.contentType).toBe("image/webp");
  });

  it("уменьшает крупный снимок до 1600 по длинной стороне", async () => {
    const result = await processImage(asFile(await makeJpeg(4000, 3000)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.width).toBe(1600);
    expect(result.image.height).toBe(1200);
  });

  it("не растягивает маленький снимок", async () => {
    const result = await processImage(asFile(await makeJpeg(400, 300)));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.width).toBe(400);
  });

  it("весит меньше оригинала", async () => {
    const original = await makeJpeg(4000, 3000);
    const result = await processImage(asFile(original));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.image.data.byteLength).toBeLessThan(original.byteLength);
  });

  it("отклоняет не изображение", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "x.jpg", {
      type: "image/jpeg",
    });

    expect(await processImage(file)).toEqual({ ok: false, reason: "broken" });
  });

  it("отклоняет неподходящий тип", async () => {
    const file = new File([new Uint8Array([1])], "x.pdf", {
      type: "application/pdf",
    });

    expect(await processImage(file)).toEqual({
      ok: false,
      reason: "unsupported_type",
    });
  });

  it("отклоняет слишком большой файл, не читая его", async () => {
    // Размер проверяется до чтения: иначе двенадцать мегабайт уедут в память
    // только чтобы получить отказ.
    const oversized = {
      size: MAX_UPLOAD_BYTES + 1,
      type: "image/jpeg",
      arrayBuffer: () => {
        throw new Error("не должно читаться");
      },
    } as unknown as File;

    expect(await processImage(oversized)).toEqual({
      ok: false,
      reason: "too_large",
    });
  });
});
