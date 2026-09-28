import { describe, expect, it } from "vitest";

import { parseTourUrl, TOUR_FRAME_SOURCES } from "./tours";

describe("parseTourUrl: что принимаем", () => {
  it("разбирает ссылку Matterport и собирает embed заново", () => {
    const result = parseTourUrl("https://my.matterport.com/show/?m=SxQL3iGyoDo");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.provider).toBe("MATTERPORT");
    expect(result.tour.embedUrl).toBe(
      "https://my.matterport.com/show/?m=SxQL3iGyoDo&play=1",
    );
    expect(result.tour.isEmbeddable).toBe(true);
  });

  it("не тащит в embed лишние параметры из исходной ссылки", () => {
    const result = parseTourUrl(
      "https://my.matterport.com/show/?m=SxQL3iGyoDo&utm_source=mail&help=1",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.embedUrl).toBe(
      "https://my.matterport.com/show/?m=SxQL3iGyoDo&play=1",
    );
  });

  it("разбирает одиночный тур Kuula", () => {
    const result = parseTourUrl("https://kuula.co/share/7ZFsh");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.provider).toBe("KUULA");
    expect(result.tour.embedUrl).toContain("https://kuula.co/share/7ZFsh?");
  });

  it("разбирает коллекцию Kuula", () => {
    const result = parseTourUrl("https://kuula.co/share/collection/7l8Qn");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tour.embedUrl).toContain("https://kuula.co/share/collection/7l8Qn?");
  });

  it("не спотыкается о пробелы по краям", () => {
    expect(parseTourUrl("  https://kuula.co/share/7ZFsh  ").ok).toBe(true);
  });
});

describe("parseTourUrl: что отклоняем", () => {
  it("отклоняет javascript:", () => {
    const result = parseTourUrl("javascript:alert(document.cookie)");
    expect(result).toEqual({ ok: false, reason: "not_https" });
  });

  it("отклоняет data:", () => {
    const result = parseTourUrl("data:text/html,<script>alert(1)</script>");
    expect(result).toEqual({ ok: false, reason: "not_https" });
  });

  it("отклоняет http без шифрования", () => {
    const result = parseTourUrl("http://my.matterport.com/show/?m=SxQL3iGyoDo");
    expect(result).toEqual({ ok: false, reason: "not_https" });
  });

  it("отклоняет домен, который лишь заканчивается на разрешённый", () => {
    const result = parseTourUrl("https://evil-matterport.com/show/?m=SxQL3iGyoDo");
    expect(result).toEqual({ ok: false, reason: "host_not_allowed" });
  });

  it("отклоняет разрешённый хост, подставленный в поддомен чужого", () => {
    const result = parseTourUrl(
      "https://my.matterport.com.attacker.net/show/?m=SxQL3iGyoDo",
    );
    expect(result).toEqual({ ok: false, reason: "host_not_allowed" });
  });

  it("отклоняет вообще не ссылку", () => {
    expect(parseTourUrl("посмотри тур у меня в телеге")).toEqual({
      ok: false,
      reason: "not_a_url",
    });
  });

  it("отклоняет ссылку на личный кабинет без идентификатора тура", () => {
    expect(parseTourUrl("https://my.matterport.com/models")).toEqual({
      ok: false,
      reason: "tour_id_not_found",
    });
  });

  it("отклоняет идентификатор с посторонними символами", () => {
    expect(
      parseTourUrl('https://my.matterport.com/show/?m=abc"><script>'),
    ).toEqual({ ok: false, reason: "tour_id_not_found" });
  });

  it("отклоняет чужой путь на разрешённом хосте", () => {
    expect(parseTourUrl("https://kuula.co/profile/someone")).toEqual({
      ok: false,
      reason: "tour_id_not_found",
    });
  });
});

describe("TOUR_FRAME_SOURCES", () => {
  it("перечисляет только https-источники", () => {
    for (const source of TOUR_FRAME_SOURCES) {
      expect(source.startsWith("https://")).toBe(true);
    }
  });

  it("покрывает хосты, которые принимает парсер", () => {
    const accepted = parseTourUrl("https://www.kuula.co/share/7ZFsh");
    expect(accepted.ok).toBe(true);
    expect(TOUR_FRAME_SOURCES).toContain("https://www.kuula.co");
  });
});
