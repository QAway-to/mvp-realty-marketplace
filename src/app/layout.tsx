import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "Каталог объектов",
  description: "Внутренний каталог объектов недвижимости агентства с 3D-турами",
  // Каталог закрытый: индексация не нужна ни на одной странице.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <header className="sticky top-0 z-10 border-b border-hairline-soft bg-canvas/95 backdrop-blur">
          <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-6">
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
                Объекты
              </Link>
              <span className="text-muted-soft" title="Появится в следующем этапе">
                Подборки
              </span>
              <span className="text-muted-soft" title="Появится в следующем этапе">
                Справочники
              </span>
            </nav>
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
