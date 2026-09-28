import { describe, expect, it } from "vitest";

import { clientAddressFrom } from "./client-address";

const withHeaders = (values: Record<string, string>) => new Headers(values);

describe("определение адреса клиента", () => {
  it("берёт ближайший к нам узел, а не подставленный клиентом", () => {
    // Слева то, что прислал клиент; справа то, что дописал наш прокси.
    const headers = withHeaders({
      "x-forwarded-for": "1.1.1.1, 2.2.2.2, 203.0.113.7",
    });

    expect(clientAddressFrom(headers)).toBe("203.0.113.7");
  });

  it("не даёт подделкой заголовка размножить ключи лимита", () => {
    const first = clientAddressFrom(
      withHeaders({ "x-forwarded-for": "9.9.9.1, 203.0.113.7" }),
    );
    const second = clientAddressFrom(
      withHeaders({ "x-forwarded-for": "9.9.9.2, 203.0.113.7" }),
    );

    // Клиент менял левую часть — ключ обязан остаться тем же.
    expect(first).toBe(second);
  });

  it("работает с одиночным значением", () => {
    expect(clientAddressFrom(withHeaders({ "x-forwarded-for": "203.0.113.7" }))).toBe(
      "203.0.113.7",
    );
  });

  it("не спотыкается о пробелы и пустые элементы", () => {
    expect(
      clientAddressFrom(withHeaders({ "x-forwarded-for": "1.1.1.1, , 203.0.113.7 ," })),
    ).toBe("203.0.113.7");
  });

  it("падает на x-real-ip, когда forwarded нет", () => {
    expect(clientAddressFrom(withHeaders({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("отдаёт unknown, когда заголовков нет вовсе", () => {
    expect(clientAddressFrom(withHeaders({}))).toBe("unknown");
  });

  it("не принимает пустой forwarded за адрес", () => {
    expect(
      clientAddressFrom(withHeaders({ "x-forwarded-for": "  ", "x-real-ip": "203.0.113.9" })),
    ).toBe("203.0.113.9");
  });
});
