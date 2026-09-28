"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyPassword } from "@/lib/auth/password";
import { startSession } from "@/lib/auth/session";
import { clientAddressFrom } from "@/lib/client-address";
import { getPrisma } from "@/lib/prisma";
import { checkRateLimit, clearRateLimit } from "@/lib/rate-limit";

export type LoginState = { readonly error: string | null };

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().max(320).pipe(z.email()),
  // Верхняя граница нужна не для политики паролей, а против расхода процессора:
  // bcrypt на чистом JS считает длинную строку заметно дольше обычной.
  password: z.string().min(1).max(200),
});

/** Попыток на один email. Это и есть защита от перебора пароля. */
const EMAIL_ATTEMPT_LIMIT = 10;
/** Попыток с одного адреса — против перебора самих учётных записей. */
const ADDRESS_ATTEMPT_LIMIT = 30;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Одно сообщение на все случаи отказа.
 *
 * Разные тексты для «нет такого email» и «неверный пароль» превращают форму
 * входа в способ узнать, кто работает в агентстве.
 */
const GENERIC_FAILURE = "Неверный email или пароль";

export async function login(
  _previous: LoginState,
  form: FormData,
): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });

  if (!parsed.success) return { error: GENERIC_FAILURE };
  const { email, password } = parsed.data;

  /*
   * Два независимых счётчика, а не один составной.
   *
   * Составной ключ «email + адрес» выглядел надёжно, но обнулялся подделкой
   * `X-Forwarded-For`: каждая попытка выглядела приходящей с нового адреса, и
   * лимит не наступал никогда. Счётчик по email подделать нельзя — чтобы
   * подбирать пароль, надо обращаться именно к этому адресу почты.
   */
  const clientAddress = clientAddressFrom(await headers());
  const emailKey = `login:email:${email}`;
  const addressKey = `login:addr:${clientAddress}`;

  const byEmail = checkRateLimit(emailKey, EMAIL_ATTEMPT_LIMIT, ATTEMPT_WINDOW_MS);
  const byAddress = checkRateLimit(
    addressKey,
    ADDRESS_ATTEMPT_LIMIT,
    ATTEMPT_WINDOW_MS,
  );

  if (!byEmail.allowed || !byAddress.allowed) {
    const retryAfter = Math.max(
      byEmail.allowed ? 0 : byEmail.retryAfterSeconds,
      byAddress.allowed ? 0 : byAddress.retryAfterSeconds,
    );
    return {
      error: `Слишком много попыток входа. Попробуйте через ${Math.ceil(retryAfter / 60)} мин.`,
    };
  }

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, isActive: true },
  });

  // Пароль проверяем даже когда пользователя нет: иначе по времени ответа
  // видно, какие адреса зарегистрированы.
  const passwordOk = await verifyPassword(password, user?.passwordHash ?? null);

  if (user === null || !passwordOk || !user.isActive) {
    return { error: GENERIC_FAILURE };
  }

  clearRateLimit(emailKey);
  clearRateLimit(addressKey);

  await getPrisma().user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await startSession(user.id);
  redirect("/objects");
}
