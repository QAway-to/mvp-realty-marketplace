/** Единый формат чисел и цен: иначе в каждой карточке он получается свой. */

const RUB = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const NUMBER = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 });

/**
 * Цена и площадь у черновика могут быть не заполнены. Ноль вместо пустого
 * значения вводит в заблуждение — «ноль рублей» и «цена не названа» это разное.
 */
export const formatPrice = (value: number | null) =>
  value === null ? "Цена не указана" : RUB.format(value);

export const formatPricePerSqm = (value: number | null) =>
  value === null ? null : `${NUMBER.format(value)} ₽/м²`;

export const formatArea = (value: number | null) =>
  value === null ? null : `${NUMBER.format(value)} м²`;

/** «Студия» — не ноль комнат, а отдельный тип планировки. */
export const formatRooms = (rooms: number | null) => {
  if (rooms === null) return null;
  return rooms === 0 ? "Студия" : `${rooms}-комн.`;
};

export const formatFloor = (floor: number | null, floorsTotal: number | null) => {
  if (floor === null) return null;
  return floorsTotal === null ? `${floor} этаж` : `${floor} из ${floorsTotal}`;
};

/** Родительный падеж числа объектов: «1 объект», «3 объекта», «12 объектов». */
export const formatFound = (total: number) => {
  const lastTwo = total % 100;
  const last = total % 10;
  const word =
    lastTwo >= 11 && lastTwo <= 14
      ? "объектов"
      : last === 1
        ? "объект"
        : last >= 2 && last <= 4
          ? "объекта"
          : "объектов";
  return `${NUMBER.format(total)} ${word}`;
};
