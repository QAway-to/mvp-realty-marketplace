import type { Metadata } from "next";
import Link from "next/link";

import { logout } from "./logout/actions";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/properties";

export const metadata: Metadata = {
  title: "Каталог объектов",
  description: "Внутренний каталог объектов недвижимости агентства с 3D-турами",
  // Каталог закрытый: индексация не нужна ни на одной странице.
  robots: { index: false, follow: false },
};

/**
 * Пользователя в шапке нет, пока каталог работает на демо-данных: там нет базы,
 * а значит и сессий. Это единственное место, где демо-режим виден в разметке.
 */
async function currentUserOrNull() {
  if (isDemoMode()) return null;
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUserOrNull();

  return (
    <html lang="ru">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <header className="sticky top-0 z-10 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-6 px-6">
            <Link href="/catalog" className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-full bg-rausch text-white"
                aria-hidden="true"
              >
                ◆
              </span>
              <span className="text-base font-semibold tracking-tight">
                Каталог объектов
              </span>
            </Link>

            <nav className="flex items-center gap-6 text-base font-semibold">
              <Link href="/catalog" className="text-ink">
                Каталог
              </Link>
              {user !== null ? (
                <Link href="/objects" className="text-ink">
                  {user.role === "ADMIN" ? "Все объекты" : "Мои объекты"}
                </Link>
              ) : null}
              <span className="text-muted-soft" title="Появится в следующем этапе">
                Подборки
              </span>
            </nav>

            {user !== null ? (
              <div className="ml-auto flex items-center gap-3 text-sm">
                <span className="text-muted">{user.name}</span>
                <form action={logout}>
                  <button
                    type="submit"
                    className="text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
                  >
                    Выйти
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </header>

        <main className="mx-auto max-w-[1280px] px-6 py-8">{children}</main>

        <footer className="mx-auto max-w-[1280px] px-6 pb-12 pt-6 text-sm text-muted">
          Внутренний инструмент агентства. Ссылки клиентам выдаются отдельно.
        </footer>
      </body>
    </html>
  );
}
