/**
 * Вид объекта, который уходит в браузер.
 *
 * Отдельный тип, а не запись из базы: у объекта есть внутренние поля —
 * комиссия, номер квартиры, служебные заметки, владелец карточки. Публичная
 * страница для клиента рендерится из этого же типа, поэтому внутренним полям
 * здесь не место физически, а не по договорённости.
 */

export type DealType = "SALE" | "RENT";

export type PropertyCardView = {
  readonly id: string;
  readonly title: string;
  readonly dealType: DealType;
  readonly price: number | null;
  readonly pricePerSqm: number | null;
  readonly areaTotal: number | null;
  readonly rooms: number | null;
  readonly floor: number | null;
  readonly floorsTotal: number | null;
  readonly districtName: string | null;
  readonly complexName: string | null;
  readonly street: string | null;
  readonly hasTour: boolean;
  readonly imagesCount: number;
  /** null — показываем плашку-заглушку, внешние картинки не подтягиваем. */
  readonly coverUrl: string | null;
};

export type PropertyPage = {
  readonly items: readonly PropertyCardView[];
  readonly total: number;
};
