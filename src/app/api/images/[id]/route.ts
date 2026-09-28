import { getPrisma } from "@/lib/prisma";

/**
 * Отдаёт фотографию из базы.
 *
 * Маршрут публичный по идентификатору: он же понадобится на странице подборки
 * для клиента, у которого сессии нет. Идентификатор — cuid, угадать его нельзя,
 * а перебрать дороже, чем получить ссылку от агента. Внутренних полей объекта
 * картинка не раскрывает.
 *
 * Байты не меняются никогда: новый снимок получает новый идентификатор. Поэтому
 * `immutable` и год жизни в кеше — браузер не придёт сюда второй раз.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!/^[a-z0-9]{20,40}$/i.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  const blob = await getPrisma().imageBlob.findUnique({
    where: { id },
    select: { data: true, contentType: true, byteSize: true },
  });

  if (blob === null) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": blob.contentType,
      "Content-Length": String(blob.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Картинка не должна исполняться как что-то другое, если тип окажется не тем.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
