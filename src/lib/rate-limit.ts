/**
 * Ограничение частоты попыток. Скользящее окно в памяти процесса.
 *
 * Честно про границы: счётчик живёт в одном инстансе. При нескольких инстансах
 * на Render лимит станет мягче ровно во столько раз, сколько инстансов, а после
 * перезапуска обнулится. Для защиты входа внутреннего инструмента этого
 * достаточно; если дойдёт до нескольких инстансов, счётчик переносится в
 * Postgres или Redis, и это единственное место, которое придётся править.
 */

type Attempt = { readonly count: number; readonly resetAt: number };

const attempts = new Map<string, Attempt>();

export type RateLimitResult =
  | { readonly allowed: true; readonly remaining: number }
  | { readonly allowed: false; readonly retryAfterSeconds: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const current = attempts.get(key);

  if (current === undefined || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
    };
  }

  attempts.set(key, { count: current.count + 1, resetAt: current.resetAt });
  return { allowed: true, remaining: limit - current.count - 1 };
}

/** После успешного входа счётчик по ключу сбрасывается. */
export const clearRateLimit = (key: string): void => {
  attempts.delete(key);
};

/** Записи с истёкшим окном не нужны — иначе карта растёт на каждом новом ключе. */
export function pruneRateLimits(now = Date.now()): number {
  const expired = [...attempts.entries()].filter(
    ([, attempt]) => attempt.resetAt <= now,
  );
  for (const [key] of expired) attempts.delete(key);
  return expired.length;
}
