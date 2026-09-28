"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { SORT_TOKENS } from "@/lib/filters";

interface Option {
  readonly value: string;
  readonly label: string;
}

interface FilterBarProps {
  readonly districts: readonly Option[];
}

const DEALS: readonly Option[] = [
  { value: "sale", label: "Купить" },
  { value: "rent", label: "Снять" },
];

const TYPES: readonly Option[] = [
  { value: "apartment", label: "Квартира" },
  { value: "house", label: "Дом" },
  { value: "land", label: "Участок" },
  { value: "commercial", label: "Коммерция" },
];

const ROOMS: readonly Option[] = [
  { value: "0", label: "Студия" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4plus", label: "4+" },
];

const SORT_LABELS: Readonly<Record<(typeof SORT_TOKENS)[number], string>> = {
  created_desc: "Сначала новые",
  price_asc: "Цена: сначала дешёвые",
  price_desc: "Цена: сначала дорогие",
  pps_asc: "Цена за м²: по возрастанию",
  pps_desc: "Цена за м²: по убыванию",
  area_desc: "Сначала большие",
};

const chip = (isActive: boolean) =>
  [
    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
    isActive
      ? "border-ink bg-ink text-white"
      : "border-hairline bg-canvas text-body hover:border-ink",
  ].join(" ");

export function FilterBar({ districts }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** Любое изменение фильтра — это новый URL. Другого состояния у панели нет. */
  const apply = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams.toString());
      mutate(next);
      // Страница всегда сбрасывается: третья страница прошлой выдачи к новому
      // фильтру отношения не имеет.
      next.delete("page");
      const query = next.toString();
      router.push(query === "" ? pathname : `${pathname}?${query}`);
    },
    [pathname, router, searchParams],
  );

  const setParam = (key: string, value: string | null) =>
    apply((params) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });

  const toggleInList = (key: string, value: string) =>
    apply((params) => {
      const current = (params.get(key) ?? "")
        .split(",")
        .filter((part) => part !== "");
      const next = current.includes(value)
        ? current.filter((part) => part !== value)
        : [...current, value];

      if (next.length === 0) params.delete(key);
      else params.set(key, next.join(","));
    });

  const toggleFlag = (key: string) =>
    apply((params) => {
      if (params.has(key)) params.delete(key);
      else params.set(key, "1");
    });

  const isInList = (key: string, value: string) =>
    (searchParams.get(key) ?? "").split(",").includes(value);

  const deal = searchParams.get("deal") ?? "sale";
  const hasAnyFilter = [...searchParams.keys()].length > 0;

  return (
    <section
      aria-label="Фильтры каталога"
      className="flex flex-col gap-4 border-b border-hairline-soft pb-5"
    >
      <div className="flex flex-wrap items-center gap-2">
        {DEALS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setParam("deal", option.value)}
            className={chip(deal === option.value)}
            aria-pressed={deal === option.value}
          >
            {option.label}
          </button>
        ))}

        <span className="mx-1 h-6 w-px bg-hairline" aria-hidden="true" />

        {TYPES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleInList("type", option.value)}
            className={chip(isInList("type", option.value))}
            aria-pressed={isInList("type", option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">Комнат</span>
        {ROOMS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => toggleInList("rooms", option.value)}
            className={chip(isInList("rooms", option.value))}
            aria-pressed={isInList("rooms", option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          apply((params) => {
            for (const key of ["priceMin", "priceMax", "areaMin", "areaMax", "q"]) {
              const value = String(form.get(key) ?? "").trim();
              if (value === "") params.delete(key);
              else params.set(key, value);
            }
          });
        }}
      >
        <label className="flex flex-col gap-1 text-[13px] text-muted">
          Цена, ₽
          <span className="flex items-center gap-1">
            <input
              name="priceMin"
              type="number"
              min={0}
              placeholder="от"
              defaultValue={searchParams.get("priceMin") ?? ""}
              className="w-28 rounded-[var(--radius-control)] border border-hairline px-3 py-2 text-sm text-ink"
            />
            <input
              name="priceMax"
              type="number"
              min={0}
              placeholder="до"
              defaultValue={searchParams.get("priceMax") ?? ""}
              className="w-28 rounded-[var(--radius-control)] border border-hairline px-3 py-2 text-sm text-ink"
            />
          </span>
        </label>

        <label className="flex flex-col gap-1 text-[13px] text-muted">
          Площадь, м²
          <span className="flex items-center gap-1">
            <input
              name="areaMin"
              type="number"
              min={0}
              step="0.1"
              placeholder="от"
              defaultValue={searchParams.get("areaMin") ?? ""}
              className="w-24 rounded-[var(--radius-control)] border border-hairline px-3 py-2 text-sm text-ink"
            />
            <input
              name="areaMax"
              type="number"
              min={0}
              step="0.1"
              placeholder="до"
              defaultValue={searchParams.get("areaMax") ?? ""}
              className="w-24 rounded-[var(--radius-control)] border border-hairline px-3 py-2 text-sm text-ink"
            />
          </span>
        </label>

        <label className="flex flex-1 flex-col gap-1 text-[13px] text-muted">
          Поиск
          <input
            name="q"
            type="search"
            placeholder="улица, ЖК или название"
            defaultValue={searchParams.get("q") ?? ""}
            className="min-w-48 rounded-full border border-hairline px-4 py-2 text-sm text-ink"
          />
        </label>

        <button
          type="submit"
          className="h-10 rounded-[var(--radius-control)] bg-rausch px-5 text-sm font-medium text-white transition-colors hover:bg-rausch-active"
        >
          Применить
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => toggleFlag("tour")}
          className={chip(searchParams.has("tour"))}
          aria-pressed={searchParams.has("tour")}
        >
          Только с 3D-туром
        </button>
        <button
          type="button"
          onClick={() => toggleFlag("notFirst")}
          className={chip(searchParams.has("notFirst"))}
          aria-pressed={searchParams.has("notFirst")}
        >
          Не первый этаж
        </button>
        <button
          type="button"
          onClick={() => toggleFlag("notLast")}
          className={chip(searchParams.has("notLast"))}
          aria-pressed={searchParams.has("notLast")}
        >
          Не последний этаж
        </button>
        <button
          type="button"
          onClick={() => toggleFlag("parking")}
          className={chip(searchParams.has("parking"))}
          aria-pressed={searchParams.has("parking")}
        >
          Парковка
        </button>

        <span className="mx-1 h-6 w-px bg-hairline" aria-hidden="true" />

        {districts.map((district) => (
          <button
            key={district.value}
            type="button"
            onClick={() => toggleInList("district", district.value)}
            className={chip(isInList("district", district.value))}
            aria-pressed={isInList("district", district.value)}
          >
            {district.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex items-center gap-2 text-[13px] text-muted">
          Сортировка
          <select
            value={searchParams.get("sort") ?? "created_desc"}
            onChange={(event) => setParam("sort", event.target.value)}
            className="rounded-[var(--radius-control)] border border-hairline bg-canvas px-3 py-2 text-sm text-ink"
          >
            {SORT_TOKENS.map((token) => (
              <option key={token} value={token}>
                {SORT_LABELS[token]}
              </option>
            ))}
          </select>
        </label>

        {hasAnyFilter ? (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-sm font-medium text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
          >
            Сбросить фильтры
          </button>
        ) : null}
      </div>
    </section>
  );
}
