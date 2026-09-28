/**
 * Локальная база или удалённая. Нужно в двух местах, поэтому вынесено сюда:
 * `migrate dev` допустим только локально, и случайный пароль администратора
 * печатать в лог можно тоже только локально.
 */

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

export function databaseHostname(connectionString: string): string | null {
  try {
    return new URL(connectionString).hostname;
  } catch {
    return null;
  }
}

export function isLocalDatabase(connectionString: string): boolean {
  const hostname = databaseHostname(connectionString);
  return hostname !== null && LOCAL_HOSTS.has(hostname);
}
