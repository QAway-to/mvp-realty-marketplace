import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "./LoginForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage() {
  // Уже вошедшего незачем спрашивать снова.
  if ((await getCurrentUser()) !== null) redirect("/objects");

  return (
    <div className="mx-auto flex max-w-100 flex-col gap-6 py-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-[22px] font-medium tracking-tight">Вход</h1>
        <p className="text-sm text-muted">
          Доступ только для сотрудников агентства. Учётную запись создаёт
          администратор.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
