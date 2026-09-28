/**
 * Сессии: выдача, проверка, снятие.
 *
 * В cookie уходит случайный токен, в базе лежит только его SHA-256. Утечка
 * дампа базы не даёт войти ни под кем, а отключение пользователя обрывает
 * сессию на следующем же запросе, потому что проверка каждый раз идёт в базу.
 */

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { getPrisma } from "@/lib/prisma";

import { SESSION_COOKIE } from "./cookie";

export { SESSION_COOKIE };

/** Две недели: внутренний инструмент, агент не должен логиниться каждый день. */
const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;

/** 32 байта из CSPRNG. Угадать такой токен нельзя, перебрать — тоже. */
export const createSessionToken = (): string => randomBytes(32).toString("hex");

export const hashSessionToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/**
 * Сравнение хешей в постоянное время. В этой схеме поиск идёт по уникальному
 * индексу, так что утечка через время сравнения маловероятна, но писать
 * побайтовое сравнение секретов вручную незачем, когда есть готовое.
 */
export function sessionTokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

export type SessionUser = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: "AGENT" | "ADMIN";
};

/** Создаёт сессию и ставит cookie. Вызывается только из server action входа. */
export async function startSession(userId: string): Promise<void> {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getPrisma().session.create({
    data: { userId, tokenHash: hashSessionToken(token), expiresAt },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token !== undefined) {
    // deleteMany, а не delete: отсутствующая сессия — не ошибка, выйти можно и
    // по уже истёкшей cookie.
    await getPrisma().session.deleteMany({
      where: { tokenHash: hashSessionToken(token) },
    });
  }

  store.delete(SESSION_COOKIE);
}

/**
 * Текущий пользователь или `null`. Проверяется всё сразу: что сессия есть, что
 * не истекла и что пользователь не отключён.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token === undefined || token === "") return null;

  const session = await getPrisma().session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: {
      expiresAt: true,
      user: {
        select: { id: true, email: true, name: true, role: true, isActive: true },
      },
    },
  });

  if (session === null) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;
  if (!session.user.isActive) return null;

  const { id, email, name, role } = session.user;
  return { id, email, name, role };
}
