import type { Metadata } from "next";
import Link from "next/link";

import { createProperty } from "../actions";
import { PropertyForm } from "../PropertyForm";
import { requireUser } from "@/lib/auth/guards";
import { listReferences } from "@/lib/references";

export const metadata: Metadata = { title: "Новый объект" };

export default async function NewPropertyPage() {
  await requireUser();
  const references = await listReferences();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/objects"
          className="self-start text-sm text-muted underline decoration-hairline underline-offset-4 hover:text-ink"
        >
          ← К объектам
        </Link>
        <h1 className="text-[22px] font-medium tracking-tight">Новый объект</h1>
        <p className="text-sm text-muted">
          Черновик сохраняется с неполными данными — заполняйте по ходу разговора
          с собственником.
        </p>
      </div>

      {references.cities.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-soft p-6">
          <p className="font-medium text-error">В справочнике нет городов</p>
          <p className="mt-1 text-sm text-body">
            Город обязателен для объекта. Заполните справочник городов и районов —
            это делает администратор, командой сидов или через базу.
          </p>
        </div>
      ) : (
        <PropertyForm
          action={createProperty}
          references={references}
          submitLabel="Сохранить черновик"
          canPublish
        />
      )}
    </div>
  );
}
