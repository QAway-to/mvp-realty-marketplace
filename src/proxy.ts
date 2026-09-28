import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * Быстрый гейт на входе: без cookie сессии внутренние страницы не рисуем.
 *
 * Это не защита, а чтобы анонимный посетитель сразу попадал на вход, а не на
 * пустой каталог. Настоящая проверка — `requireUser()` на каждой странице и в
 * каждом действии: cookie можно подделать, срок её истечь, а пользователя
 * отключить, и знает об этом только база.
 *
 * В Next 16 файл называется `proxy`, а не `middleware`, и работает на Node.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/share",
  // Фотографии отдаются по неугадываемому идентификатору и нужны клиенту, у
  // которого сессии нет. Внутренних полей объекта картинка не раскрывает.
  "/api/images",
  "/_next",
  "/favicon",
];

/**
 * Сравнение с границей сегмента, а не просто `startsWith`.
 *
 * Иначе любой будущий маршрут, чей путь начинается с тех же символов —
 * `/login-attempts`, `/shared-drafts` — молча стал бы публичным, и заметить это
 * было бы негде: ошибка живёт в этом файле, а появляется в другом.
 */
const isPublicPath = (pathname: string): boolean =>
  PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // В демо-режиме базы нет, а значит нет ни пользователей, ни сессий: гейт
  // отправлял бы всех на форму входа, которой не во что войти.
  if (process.env.USE_DEMO_DATA === "1") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session !== undefined && session !== "") {
    return NextResponse.next();
  }

  // API отвечает кодом, а не редиректом: бросать клиента с ожидаемым JSON на
  // HTML формы входа — верный способ получить непонятную ошибку разбора.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

/**
 * `/api` из исключений убран: маршруты под ним тоже проходят гейт. Каждый из
 * них всё равно обязан сам вызвать `requireUser()` — но пусть непройденная
 * проверка будет второй линией, а не единственной.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
