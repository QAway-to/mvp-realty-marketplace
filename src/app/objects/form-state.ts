/**
 * Состояние формы объекта живёт отдельно от действий.
 *
 * Файл с `"use server"` может экспортировать только асинхронные функции, а
 * начальное состояние — это объект. Держать его рядом с действиями нельзя.
 */

import type { FieldErrors } from "@/lib/property-form";

export type PropertyFormState = {
  readonly errors: FieldErrors;
  readonly message: string | null;
};

export const EMPTY_FORM_STATE: PropertyFormState = { errors: {}, message: null };
