/**
 * Проверки доступа для страниц и server actions.
 *
 * Гейт в `proxy.ts` смотрит только на наличие cookie — этого достаточно, чтобы
 * не рисовать интерфейс анонимному посетителю, но недостаточно как защита:
 * cookie можно подделать, срок её истечь, а пользователя отключить. Поэтому
 * каждая страница и каждое действие спрашивают у базы само́й, кто пришёл.
 */

import { redirect } from "next/navigation";

import { getCurrentUser, type SessionUser } from "./session";

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user === null) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/objects");
  return user;
}

/**
 * Агент правит свои объекты, админ — любые. Возвращает причину отказа, а не
 * бросает: вызывающий сам решает, показать 404 или текст ошибки в форме.
 */
export const canEditProperty = (
  user: SessionUser,
  ownerId: string | null,
): boolean => user.role === "ADMIN" || (ownerId !== null && ownerId === user.id);
