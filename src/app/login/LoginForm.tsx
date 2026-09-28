"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const INITIAL: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(login, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        Email
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-14 rounded-[var(--radius-control)] border border-hairline px-3 text-base text-ink"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        Пароль
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-14 rounded-[var(--radius-control)] border border-hairline px-3 text-base text-ink"
        />
      </label>

      {state.error !== null ? (
        <p role="alert" className="text-sm text-error">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-[var(--radius-control)] bg-rausch px-6 text-base font-medium text-white transition-colors hover:bg-rausch-active disabled:bg-rausch-disabled"
      >
        {pending ? "Проверяем…" : "Войти"}
      </button>
    </form>
  );
}
