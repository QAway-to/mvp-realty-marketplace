"use client";

import { useActionState, useState } from "react";

import { EMPTY_FORM_STATE, type PropertyFormState } from "./form-state";
import type {
  ComplexReference,
  DistrictReference,
  Reference,
} from "@/lib/references";

export type PropertyFormValues = {
  readonly title?: string;
  readonly dealType?: string;
  readonly propertyType?: string;
  readonly price?: string;
  readonly commissionPercent?: string;
  readonly areaTotal?: string;
  readonly areaLiving?: string;
  readonly areaKitchen?: string;
  readonly landArea?: string;
  readonly rooms?: string;
  readonly floor?: string;
  readonly floorsTotal?: string;
  readonly bathrooms?: string;
  readonly balcony?: string;
  readonly ceilingHeight?: string;
  readonly buildingType?: string;
  readonly renovation?: string;
  readonly builtYear?: string;
  readonly parking?: boolean;
  readonly cityId?: string;
  readonly districtId?: string;
  readonly complexId?: string;
  readonly street?: string;
  readonly houseNumber?: string;
  readonly apartmentNumber?: string;
  readonly description?: string;
  readonly internalNotes?: string;
  readonly tourUrl?: string;
};

interface PropertyFormProps {
  readonly action: (
    state: PropertyFormState,
    form: FormData,
  ) => Promise<PropertyFormState>;
  readonly values?: PropertyFormValues;
  readonly references: {
    readonly cities: readonly Reference[];
    readonly districts: readonly DistrictReference[];
    readonly complexes: readonly ComplexReference[];
  };
  readonly submitLabel: string;
  readonly canPublish: boolean;
}

const FIELD =
  "h-12 w-full rounded-[var(--radius-control)] border border-hairline px-3 text-base text-ink";
const LABEL = "flex flex-col gap-1.5 text-[13px] text-muted";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={LABEL}>
      {label}
      {children}
      {error !== undefined ? (
        <span role="alert" className="text-[13px] text-error">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-hairline-soft pb-6">
      <h2 className="text-[20px] font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

export function PropertyForm({
  action,
  values = {},
  references,
  submitLabel,
  canPublish,
}: PropertyFormProps) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  // Район и ЖК зависят от города: показывать агенту районы чужого города —
  // верный способ получить объект с адресом из другого региона.
  const [cityId, setCityId] = useState(values.cityId ?? "");
  const [districtId, setDistrictId] = useState(values.districtId ?? "");

  const districts = references.districts.filter(
    (district) => district.cityId === cityId,
  );
  const complexes = references.complexes.filter(
    (complex) => complex.districtId === districtId,
  );

  const error = (field: string) => state.errors[field];

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-6">
      <Section title="Основное">
        <Field label="Название" error={error("title")}>
          <input name="title" defaultValue={values.title} className={FIELD} required />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Тип сделки" error={error("dealType")}>
            <select name="dealType" defaultValue={values.dealType ?? "SALE"} className={FIELD}>
              <option value="SALE">Продажа</option>
              <option value="RENT">Аренда</option>
            </select>
          </Field>

          <Field label="Тип объекта" error={error("propertyType")}>
            <select
              name="propertyType"
              defaultValue={values.propertyType ?? "APARTMENT"}
              className={FIELD}
            >
              <option value="APARTMENT">Квартира</option>
              <option value="HOUSE">Дом</option>
              <option value="LAND">Участок</option>
              <option value="COMMERCIAL">Коммерция</option>
            </select>
          </Field>

          <Field label="Цена, ₽" error={error("price")}>
            <input
              name="price"
              type="number"
              min={0}
              defaultValue={values.price}
              className={FIELD}
            />
          </Field>

          <Field label="Комиссия, % (не видна клиенту)" error={error("commissionPercent")}>
            <input
              name="commissionPercent"
              type="number"
              step="0.1"
              min={0}
              max={100}
              defaultValue={values.commissionPercent}
              className={FIELD}
            />
          </Field>
        </div>
      </Section>

      <Section title="Площади и планировка">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Общая, м²" error={error("areaTotal")}>
            <input name="areaTotal" type="number" step="0.1" min={0} defaultValue={values.areaTotal} className={FIELD} />
          </Field>
          <Field label="Жилая, м²" error={error("areaLiving")}>
            <input name="areaLiving" type="number" step="0.1" min={0} defaultValue={values.areaLiving} className={FIELD} />
          </Field>
          <Field label="Кухня, м²" error={error("areaKitchen")}>
            <input name="areaKitchen" type="number" step="0.1" min={0} defaultValue={values.areaKitchen} className={FIELD} />
          </Field>
          <Field label="Участок, сотки" error={error("landArea")}>
            <input name="landArea" type="number" step="0.1" min={0} defaultValue={values.landArea} className={FIELD} />
          </Field>
          <Field label="Комнат (0 — студия)" error={error("rooms")}>
            <input name="rooms" type="number" min={0} max={20} defaultValue={values.rooms} className={FIELD} />
          </Field>
          <Field label="Санузлов" error={error("bathrooms")}>
            <input name="bathrooms" type="number" min={0} defaultValue={values.bathrooms} className={FIELD} />
          </Field>
          <Field label="Этаж" error={error("floor")}>
            <input name="floor" type="number" min={1} defaultValue={values.floor} className={FIELD} />
          </Field>
          <Field label="Этажей в доме" error={error("floorsTotal")}>
            <input name="floorsTotal" type="number" min={1} defaultValue={values.floorsTotal} className={FIELD} />
          </Field>
          <Field label="Высота потолков, м" error={error("ceilingHeight")}>
            <input name="ceilingHeight" type="number" step="0.05" defaultValue={values.ceilingHeight} className={FIELD} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Балкон" error={error("balcony")}>
            <select name="balcony" defaultValue={values.balcony ?? "NONE"} className={FIELD}>
              <option value="NONE">Нет</option>
              <option value="BALCONY">Балкон</option>
              <option value="LOGGIA">Лоджия</option>
            </select>
          </Field>
          <Field label="Тип дома" error={error("buildingType")}>
            <select name="buildingType" defaultValue={values.buildingType ?? ""} className={FIELD}>
              <option value="">Не указан</option>
              <option value="PANEL">Панель</option>
              <option value="BRICK">Кирпич</option>
              <option value="MONOLITH">Монолит</option>
              <option value="BLOCK">Блок</option>
              <option value="WOOD">Дерево</option>
            </select>
          </Field>
          <Field label="Ремонт" error={error("renovation")}>
            <select name="renovation" defaultValue={values.renovation ?? ""} className={FIELD}>
              <option value="">Не указан</option>
              <option value="NONE">Без ремонта</option>
              <option value="COSMETIC">Косметический</option>
              <option value="EURO">Евро</option>
              <option value="DESIGNER">Дизайнерский</option>
            </select>
          </Field>
          <Field label="Год постройки" error={error("builtYear")}>
            <input name="builtYear" type="number" defaultValue={values.builtYear} className={FIELD} />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-base text-ink">
          <input
            name="parking"
            type="checkbox"
            defaultChecked={values.parking ?? false}
            className="h-5 w-5 rounded border-hairline"
          />
          Парковка
        </label>
      </Section>

      <Section title="Адрес">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Город" error={error("cityId")}>
            <select
              name="cityId"
              value={cityId}
              onChange={(event) => {
                setCityId(event.target.value);
                setDistrictId("");
              }}
              className={FIELD}
              required
            >
              <option value="">Выберите город</option>
              {references.cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Район" error={error("districtId")}>
            <select
              name="districtId"
              value={districtId}
              onChange={(event) => setDistrictId(event.target.value)}
              className={FIELD}
              disabled={cityId === ""}
            >
              <option value="">Не указан</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ЖК" error={error("complexId")}>
            <select
              name="complexId"
              defaultValue={values.complexId ?? ""}
              className={FIELD}
              disabled={districtId === ""}
            >
              <option value="">Не указан</option>
              {complexes.map((complex) => (
                <option key={complex.id} value={complex.id}>
                  {complex.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Улица" error={error("street")}>
            <input name="street" defaultValue={values.street} className={FIELD} />
          </Field>
          <Field label="Дом" error={error("houseNumber")}>
            <input name="houseNumber" defaultValue={values.houseNumber} className={FIELD} />
          </Field>
          <Field label="Квартира (не видна клиенту)" error={error("apartmentNumber")}>
            <input name="apartmentNumber" defaultValue={values.apartmentNumber} className={FIELD} />
          </Field>
        </div>
      </Section>

      <Section title="3D-тур">
        <Field label="Ссылка на тур" error={error("tourUrl")}>
          <input
            name="tourUrl"
            type="url"
            placeholder="https://realsee.ai/…"
            defaultValue={values.tourUrl}
            className={FIELD}
          />
        </Field>
        <p className="text-[13px] text-muted">
          Принимаются ссылки Realsee, Kuula и Matterport. Для клиентов из России
          берите Realsee: туры Matterport оттуда не открываются.
        </p>
      </Section>

      <Section title="Описание">
        <Field label="Описание для клиента" error={error("description")}>
          <textarea
            name="description"
            rows={6}
            defaultValue={values.description}
            className="w-full rounded-[var(--radius-control)] border border-hairline p-3 text-base text-ink"
          />
        </Field>
        <Field label="Внутренние заметки (не видны клиенту)" error={error("internalNotes")}>
          <textarea
            name="internalNotes"
            rows={4}
            defaultValue={values.internalNotes}
            className="w-full rounded-[var(--radius-control)] border border-hairline p-3 text-base text-ink"
          />
        </Field>
      </Section>

      {state.message !== null ? (
        <p
          role="status"
          className={
            Object.keys(state.errors).length > 0 || state.message !== "Сохранено"
              ? "text-sm text-error"
              : "text-sm text-ink"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pb-10">
        <button
          type="submit"
          name="intent"
          value="draft"
          disabled={pending}
          className="h-12 rounded-[var(--radius-control)] border border-border-strong px-6 text-base font-medium text-ink disabled:opacity-50"
        >
          {pending ? "Сохраняем…" : submitLabel}
        </button>

        {canPublish ? (
          <button
            type="submit"
            name="intent"
            value="publish"
            disabled={pending}
            className="h-12 rounded-[var(--radius-control)] bg-rausch px-6 text-base font-medium text-white transition-colors hover:bg-rausch-active disabled:bg-rausch-disabled"
          >
            Сохранить и опубликовать
          </button>
        ) : null}
      </div>
    </form>
  );
}
