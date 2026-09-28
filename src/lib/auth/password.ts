/**
 * Пароли. Хеш bcrypt, сравнение — только через `compare`.
 *
 * Стоимость 12 выбрана осознанно: на инстансе Render это десятки миллисекунд на
 * проверку, что незаметно при входе и дорого при переборе. Занижать нельзя,
 * завышать — значит подарить желающим дешёвый способ занять процессор.
 */

import bcrypt from "bcryptjs";

const COST = 12;

/** Ниже восьми символов не принимаем: остальное — дело политики, а не кода. */
export const MIN_PASSWORD_LENGTH = 8;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, COST);

/**
 * `passwordHash` может отсутствовать: приглашённый пользователь ещё не задал
 * пароль. Такому входа нет, но отвечать надо так же долго, как при неверном
 * пароле, иначе по времени ответа видно, у кого пароль уже установлен.
 */
export async function verifyPassword(
  plain: string,
  passwordHash: string | null,
): Promise<boolean> {
  if (passwordHash === null) {
    await bcrypt.compare(plain, DUMMY_HASH);
    return false;
  }
  return bcrypt.compare(plain, passwordHash);
}

/**
 * Заведомо несовпадающий хеш той же стоимости — нужен только чтобы потратить
 * столько же времени, сколько уходит на настоящую проверку.
 */
const DUMMY_HASH =
  "$2a$12$C6UzMDM.H6dfI/f/IKcEe.uWGq4jHjTmqKMQPu3wRDMGeuOOuyB0y";
