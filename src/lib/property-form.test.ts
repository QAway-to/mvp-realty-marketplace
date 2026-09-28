import { describe, expect, it } from "vitest";

import {
  deriveFields,
  missingForPublish,
  parsePropertyForm,
  type PropertyFormInput,
} from "./property-form";

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

const MINIMAL = {
  title: "Двушка у парка",
  dealType: "SALE",
  propertyType: "APARTMENT",
};

const parse = (fields: Record<string, string>): PropertyFormInput => {
  const result = parsePropertyForm(form({ ...MINIMAL, ...fields }));
  if (!result.ok) {
    throw new Error(`не разобралось: ${JSON.stringify(result.errors)}`);
  }
  return result.data;
};

const errorsOf = (fields: Record<string, string>) => {
  const result = parsePropertyForm(form({ ...MINIMAL, ...fields }));
  if (result.ok) throw new Error("ожидалась ошибка, а форма прошла");
  return result.errors;
};

describe("черновик принимается неполным", () => {
  it("сохраняется без цены, площади и адреса", () => {
    const data = parse({});

    expect(data.price).toBeUndefined();
    expect(data.areaTotal).toBeUndefined();
    expect(data.street).toBeUndefined();
  });

  it("пустые поля считаются незаполненными, а не нулями", () => {
    const data = parse({ price: "", areaTotal: "", rooms: "", floor: "" });

    expect(data.price).toBeUndefined();
    expect(data.areaTotal).toBeUndefined();
    expect(data.rooms).toBeUndefined();
  });

  it("студия — это ноль комнат, а не отсутствие значения", () => {
    expect(parse({ rooms: "0" }).rooms).toBe(0);
  });

  it("невыставленный чекбокс — это false, а не ошибка", () => {
    expect(parse({}).parking).toBe(false);
    expect(parse({ parking: "on" }).parking).toBe(true);
  });
});

describe("проверки, которые ловят ошибки ввода", () => {
  it("не пропускает этаж выше этажности дома", () => {
    expect(errorsOf({ floor: "10", floorsTotal: "9" }).floor).toContain(
      "не может быть больше",
    );
  });

  it("пропускает последний этаж", () => {
    expect(parse({ floor: "9", floorsTotal: "9" }).floor).toBe(9);
  });

  it("не пропускает жилую площадь больше общей", () => {
    expect(errorsOf({ areaTotal: "50", areaLiving: "60" })).toHaveProperty(
      "areaLiving",
    );
  });

  it("не пропускает кухню больше общей площади", () => {
    expect(errorsOf({ areaTotal: "50", areaKitchen: "60" })).toHaveProperty(
      "areaKitchen",
    );
  });

  it("не принимает отрицательную цену", () => {
    expect(errorsOf({ price: "-100" })).toHaveProperty("price");
  });

  it("не принимает слишком короткое название", () => {
    const result = parsePropertyForm(form({ ...MINIMAL, title: "дв" }));
    expect(result.ok).toBe(false);
  });

  it("не принимает неизвестный тип объекта", () => {
    const result = parsePropertyForm(form({ ...MINIMAL, propertyType: "YACHT" }));
    expect(result.ok).toBe(false);
  });

  it("не принимает год постройки из будущего", () => {
    const farFuture = String(new Date().getFullYear() + 50);
    expect(errorsOf({ builtYear: farFuture })).toHaveProperty("builtYear");
  });
});

describe("ссылка на тур проверяется в форме", () => {
  it("принимает ссылку Realsee", () => {
    expect(parse({ tourUrl: "https://realsee.ai/8VRR9e8a?at3d=1" }).tourUrl).toBe(
      "https://realsee.ai/8VRR9e8a?at3d=1",
    );
  });

  it("отклоняет чужой домен и объясняет причину рядом с полем", () => {
    const errors = errorsOf({ tourUrl: "https://evil.example.com/tour" });
    expect(errors.tourUrl).toContain("Realsee");
  });

  it("отклоняет javascript: в поле тура", () => {
    expect(errorsOf({ tourUrl: "javascript:alert(1)" })).toHaveProperty("tourUrl");
  });
});

describe("публикация требует полноты", () => {
  it("перечисляет всё незаполненное человеческими словами", () => {
    const missing = missingForPublish(parse({}));

    expect(missing).toContain("цена");
    expect(missing).toContain("общая площадь");
    expect(missing).toContain("город");
    expect(missing).toContain("улица");
  });

  it("пропускает объект, у которого заполнено обязательное", () => {
    const data = parse({
      price: "18400000",
      areaTotal: "68.4",
      cityId: "city-msk",
      street: "Ленинская",
    });

    expect(missingForPublish(data)).toEqual([]);
  });
});

describe("расчётные поля", () => {
  it("считает цену за метр", () => {
    const data = parse({ price: "18400000", areaTotal: "68.4" });
    expect(deriveFields(data, false).pricePerSqm).toBe(269_006);
  });

  it("не считает цену за метр без цены или площади", () => {
    expect(deriveFields(parse({ areaTotal: "50" }), false).pricePerSqm).toBeNull();
    expect(deriveFields(parse({ price: "100" }), false).pricePerSqm).toBeNull();
  });

  it("помечает последний этаж — по нему фильтруют", () => {
    expect(deriveFields(parse({ floor: "9", floorsTotal: "9" }), false).isLastFloor).toBe(
      true,
    );
    expect(deriveFields(parse({ floor: "8", floorsTotal: "9" }), false).isLastFloor).toBe(
      false,
    );
  });

  it("не считает этаж последним, когда этажность неизвестна", () => {
    expect(deriveFields(parse({ floor: "9" }), false).isLastFloor).toBe(false);
  });
});
