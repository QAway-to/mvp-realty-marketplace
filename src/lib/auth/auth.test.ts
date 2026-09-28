import { afterEach, describe, expect, it, vi } from "vitest";

import { canEditProperty } from "./guards";
import { hashPassword, verifyPassword } from "./password";
import { createSessionToken, hashSessionToken, sessionTokensMatch } from "./session";
import { checkRateLimit, clearRateLimit, pruneRateLimits } from "../rate-limit";

describe("пароли", () => {
  it("хеш не совпадает с паролем и различается между вызовами", async () => {
    const first = await hashPassword("верный-конь-батарейка");
    const second = await hashPassword("верный-конь-батарейка");

    expect(first).not.toBe("верный-конь-батарейка");
    expect(first).not.toBe(second);
  });

  it("принимает верный пароль и отвергает неверный", async () => {
    const hash = await hashPassword("верный-конь-батарейка");

    await expect(verifyPassword("верный-конь-батарейка", hash)).resolves.toBe(true);
    await expect(verifyPassword("верный-конь-батарейк", hash)).resolves.toBe(false);
  });

  it("отвергает вход, когда пароль ещё не задан", async () => {
    // Приглашённый пользователь без пароля не должен пускаться пустой строкой.
    await expect(verifyPassword("", null)).resolves.toBe(false);
    await expect(verifyPassword("любой", null)).resolves.toBe(false);
  });
});

describe("токены сессии", () => {
  it("каждый токен уникален и достаточно длинный", () => {
    const tokens = new Set(Array.from({ length: 50 }, createSessionToken));

    expect(tokens.size).toBe(50);
    for (const token of tokens) expect(token.length).toBe(64);
  });

  it("в базу уходит хеш, а не сам токен", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token);

    expect(hash).not.toBe(token);
    expect(hash).toBe(hashSessionToken(token));
  });

  it("сравнение не спотыкается о разную длину", () => {
    expect(sessionTokensMatch("abc", "abcd")).toBe(false);
    expect(sessionTokensMatch("abc", "abc")).toBe(true);
  });
});

describe("права на правку объекта", () => {
  const agent = { id: "u1", email: "a@x", name: "Агент", role: "AGENT" } as const;
  const admin = { id: "u2", email: "b@x", name: "Админ", role: "ADMIN" } as const;

  it("агент правит свой объект", () => {
    expect(canEditProperty(agent, "u1")).toBe(true);
  });

  it("агент не правит чужой", () => {
    expect(canEditProperty(agent, "u9")).toBe(false);
  });

  it("агент не правит объект без владельца", () => {
    expect(canEditProperty(agent, null)).toBe(false);
  });

  it("админ правит любой, включая осиротевший", () => {
    expect(canEditProperty(admin, "u9")).toBe(true);
    expect(canEditProperty(admin, null)).toBe(true);
  });
});

describe("лимит попыток входа", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("пропускает до лимита и отказывает после", () => {
    const key = `test-${Math.random()}`;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(checkRateLimit(key, 3, 60_000).allowed).toBe(true);
    }
    expect(checkRateLimit(key, 3, 60_000).allowed).toBe(false);
  });

  it("сообщает, сколько ждать", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 1, 60_000);
    const blocked = checkRateLimit(key, 1, 60_000);

    expect(blocked.allowed).toBe(false);
    if (blocked.allowed) return;
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("успешный вход обнуляет счётчик", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, 1, 60_000);
    clearRateLimit(key);

    expect(checkRateLimit(key, 1, 60_000).allowed).toBe(true);
  });

  it("разные ключи не мешают друг другу", () => {
    const suffix = Math.random();
    checkRateLimit(`a-${suffix}`, 1, 60_000);

    expect(checkRateLimit(`b-${suffix}`, 1, 60_000).allowed).toBe(true);
  });

  it("истёкшее окно открывается снова", () => {
    // Два синхронных вызова попадают в одну миллисекунду, поэтому время
    // приходится двигать явно, а не надеяться на паузу между ними.
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;

    checkRateLimit(key, 1, 1000);
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(false);

    vi.advanceTimersByTime(1001);
    expect(checkRateLimit(key, 1, 1000).allowed).toBe(true);
  });

  it("чистка убирает истёкшие записи, чтобы карта не росла", () => {
    const key = `prune-${Math.random()}`;
    checkRateLimit(key, 1, 1);

    expect(pruneRateLimits(Date.now() + 1000)).toBeGreaterThan(0);
  });
});
