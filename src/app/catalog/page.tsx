import Link from "next/link";

import { FilterBar } from "@/components/FilterBar";
import { PropertyCard } from "@/components/PropertyCard";
import { DEMO_DISTRICTS } from "@/lib/demo-data";
import { PAGE_SIZE, parseFilters } from "@/lib/filters";
import { formatFound } from "@/lib/format";
import { isDemoMode, listProperties } from "@/lib/properties";
import { listReferences } from "@/lib/references";

export default async function CatalogPage(props: PageProps<"/catalog">) {
  const searchParams = await props.searchParams;
  const parsed = parseFilters(searchParams);

  // Некорректное значение в ссылке показываем, а не проглатываем: иначе агент
  // решит, что фильтр применился, и будет работать с неправильной выдачей.
  if (!parsed.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[22px] font-medium tracking-tight">Каталог</h1>
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-soft p-6">
          <p className="font-medium text-error">Не удалось разобрать фильтры</p>
          <ul className="mt-2 list-inside list-disc text-sm text-body">
            {parsed.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <Link
            href="/catalog"
            className="mt-4 inline-block text-sm font-medium text-ink underline underline-offset-4"
          >
            Открыть каталог без фильтров
          </Link>
        </div>
      </div>
    );
  }

  const { filters } = parsed;
  const { items, total } = await listProperties(filters);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Районы для фильтра приходят из справочника базы; в демо-режиме базы нет.
  const districts = isDemoMode()
    ? DEMO_DISTRICTS.map((district) => ({ value: district.id, label: district.name }))
    : (await listReferences()).districts.map((district) => ({
        value: district.id,
        label: district.name,
      }));

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      const single = Array.isArray(value) ? value[0] : value;
      if (single !== undefined && key !== "page") params.set(key, single);
    }
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    return query === "" ? "/catalog" : `/catalog?${query}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-[22px] font-medium tracking-tight">Каталог</h1>
        {isDemoMode() ? (
          <span className="rounded-full bg-surface-strong px-3 py-1 text-[12px] font-semibold text-body">
            Демо-данные · Postgres не подключён
          </span>
        ) : null}
      </div>

      <FilterBar districts={districts} />

      <p className="text-sm text-muted">{formatFound(total)}</p>

      {items.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface-soft p-10 text-center">
          <p className="text-base font-medium">Под эти условия ничего не нашлось</p>
          <p className="mt-1 text-sm text-muted">
            Попробуйте снять часть фильтров — например, ограничение по цене.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((property) => (
            <li key={property.id}>
              <PropertyCard property={property} />
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? (
        <nav
          aria-label="Страницы выдачи"
          className="flex items-center justify-center gap-2 pt-4"
        >
          {Array.from({ length: pages }, (_, index) => index + 1).map((page) => (
            <Link
              key={page}
              href={pageHref(page)}
              aria-current={page === filters.page ? "page" : undefined}
              className={[
                "grid h-10 w-10 place-items-center rounded-full text-sm",
                page === filters.page
                  ? "bg-ink text-white"
                  : "border border-hairline text-body hover:border-ink",
              ].join(" ")}
            >
              {page}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
