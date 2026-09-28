/** Общее для разбора форм и query string. */

/**
 * Пустая строка — это отсутствующее значение, а не нуль и не ошибка. И в URL, и
 * в HTML-форме незаполненное поле приезжает как `""`, поэтому правило одно на
 * оба места.
 */
export const blankToUndefined = (raw: unknown) =>
  typeof raw === "string" && raw.trim() === "" ? undefined : raw;
