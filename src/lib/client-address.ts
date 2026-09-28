/**
 * Адрес клиента из заголовков прокси.
 *
 * `X-Forwarded-For` растёт слева направо: слева то, что подставил сам клиент,
 * справа — то, что дописал ближайший к нам прокси. Поэтому брать левый элемент
 * нельзя: его подделывает кто угодно, и лимит попыток, построенный на таком
 * «адресе», не срабатывает никогда — каждый запрос выглядит как новый клиент.
 *
 * Берём правый элемент: его подставил наш прокси, а не посетитель.
 */
export function clientAddressFrom(requestHeaders: Headers): string {
  const forwarded = requestHeaders.get("x-forwarded-for");

  if (forwarded !== null) {
    const hops = forwarded
      .split(",")
      .map((hop) => hop.trim())
      .filter((hop) => hop !== "");

    const nearest = hops.at(-1);
    if (nearest !== undefined) return nearest;
  }

  return requestHeaders.get("x-real-ip") ?? "unknown";
}
